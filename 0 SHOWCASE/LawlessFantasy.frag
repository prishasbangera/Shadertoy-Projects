/*

Lawless Fantasy

Prisha B.
2021-10-12

Link: https://www.shadertoy.com/view/7scXWf

SOURCES:

Learning from Inigo Quilez's videos and articles.

FBM detail in SDFs
https://iquilezles.org/articles/fbmsdf/fbmsdf.htm

*/

const float EPSILON = 0.001;

//*******************************************************//

// Light struct
struct Light {
    vec3 clr;
    vec3 dir;
    float shadowSoftness;
};

// Material struct
struct Material {
    vec3 clr;
    float amb;
    float dif;
    float spec;
    float shininess;
    vec3 ref;
    float id;
};

//*******************************************************//

// clamp value from 0 to 1
float uclamp(float val) {
    return clamp(val, 0.0, 1.0);
}

//*******************************************************//

// SMOOTH MIN from Inigo Quilez
float smoothmin(in float a, in float b, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

// smoothmax
float smoothmax( float a, float b, float k ) {
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}

// Smooth min for distance and color
vec4 smoothmin(in float a, in float b, in vec3 clr1, in vec3 clr2, in float k) {
   float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
   float d = mix(b, a, h) - k*h*(1.0-h);
   vec3 c = mix(clr2, clr1, h);
   return vec4(c, d);
}

// return points for finite and infinite repetition

vec3 infRep(in vec3 pt, in vec3 period) {
    return mod(pt + 0.5 * period, period) - 0.5 * period;
}

vec3 finRep(in vec3 pt, in vec3 period, in vec3 minLim, in vec3 maxLim) {
    return pt - period * clamp(round(pt/period), minLim, maxLim);
}

vec3 finRep(in vec3 pt, in vec3 period, in vec3 lim) {
    return pt - period * clamp(round(pt/period), -lim, lim);
}


//*******************************************************//

// random and noise

float random(in float v) {
    return fract(15465.1327854 * sin(v * 231.72));
}

float random(in vec2 v) {
    return fract(15465.1327854 * sin(dot(v, vec2(173.93422, 102.5165))));
}

float random(in vec3 v) {
    return fract(15465.1327854 * sin(dot(v, vec3(173.93422, 102.5165, 23.1234))));
}

float noise(in vec3 uvw) {
    
    vec3 fid = fract(uvw); // fraction part of uvw -> where in the grid cell
    fid = fid * fid * (3.0 - 2.0 * fid);
    vec3 id = floor(uvw); // integer part of uvw -> which grid cell
    
    // lerp bottom face
    float bf = mix(random(id + vec3(0, 0, 0)), random(id + vec3(1, 0, 0)), fid.x);
    float bb = mix(random(id + vec3(0, 0, 1)), random(id + vec3(1, 0, 1)), fid.x);
    float b = mix(bf, bb, fid.z);
 
    // lerp top face
    float tf = mix(random(id + vec3(0, 1, 0)), random(id + vec3(1, 1, 0)), fid.x);
    float tb = mix(random(id + vec3(0, 1, 1)), random(id + vec3(1, 1, 1)), fid.x);
    float t = mix(tf, tb, fid.z);
    
    return mix(b, t, fid.y);
    
}

float fractalNoise(in vec3 uvw) {
    float c = noise(uvw * 4.0);
    c += 0.5 * noise(uvw * 8.0);
    c += 0.25 * noise(uvw * 16.0);
    c += 0.125 * noise(uvw * 32.0);
    c += 0.0625 * noise(uvw * 64.0);
    c /= 2.0;
    return c;
}

//*******************************************************//

// SDFs

float sdfSphere(in vec3 pt, in float rad) {
    return length(pt) - rad;
}

float sdfBox(vec3 pt, vec3 b) {
	vec3 q = abs(pt) - b;
	return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdfRandSphere(vec3 id, vec3 fid, vec3 t) {
    // random radius 
    float r = 0.5*random(id+t);
    // sphere signed distance
    return length(fid - t) - r;
}


//*******************************************************//

// SDF BASE

float sdfBase(in vec3 pt) {

    vec3 id = floor(pt);
    vec3 fid = fract(pt);

    // 8 corner spheres
    float base = sdfRandSphere(id, fid, vec3(0, 0, 0));
    base = min(base, sdfRandSphere(id, fid, vec3(0, 0, 1)));
    base = min(base, sdfRandSphere(id, fid, vec3(0, 1, 0)));
    base = min(base, sdfRandSphere(id, fid, vec3(0, 1, 1)));
    base = min(base, sdfRandSphere(id, fid, vec3(1, 0, 0)));
    base = min(base, sdfRandSphere(id, fid, vec3(1, 0, 1)));
    base = min(base, sdfRandSphere(id, fid, vec3(1, 1, 0)));
    base = min(base, sdfRandSphere(id, fid, vec3(1, 1, 1)));
    
    return base;

}

// SDF SCENE

float sdfScene(in vec3 pt, out Material mat) {

    // default material
    mat.amb = 0.01;

    // distance to closest object
    float res;
    
    // water stuff
    
    float water = pt.y - 0.06;
    Material waterMat;
    {
        waterMat.clr = vec3(0.05, 0.04, 0.15);
        waterMat.dif = 0.1;
        waterMat.spec = 1.0;
        waterMat.shininess = 10.0;
        waterMat.ref = vec3(0.3, 0.65, 0.75);
        waterMat.id = 0.0;
    }
    
    
    // sphere and plane
    float sphere = sdfSphere(pt - vec3(0, 0.2, 0), 3.3);
    float terrain = pt.y+0.05;
    
    // fbm
    {
        vec3 p = pt;
        // scale
        float scl = 1.0;
        // subtract
        for (int i = 0; i < 12; i++) {
            // eval noise base
            float n = scl*sdfBase(p);
            // subtract from sphere
            if (i < 8) sphere = smoothmax(sphere, -n, scl*0.2);
            // add to plane
            n = smoothmax(n, terrain-0.1*scl, 0.3*scl);
            terrain = smoothmin(n, terrain, 0.3*scl);
            // rotate point (matrix from Inigo's article)
            p = mat3(
                 0.00, 1.60, 1.20,
                -1.60, 0.72,-0.96,
                -1.20,-0.96, 1.28
            ) * p;
            
            // half amplitude
            scl *= 0.5;
        }
    }
    
    // material
    Material landMat;
    {
        landMat.id = 1.0;
        landMat.ref = vec3(0.0);
        if (terrain < sphere) {
            landMat.clr = vec3(0.05, 0.03, 0.04);
            landMat.dif = 0.4;
            landMat.spec = 0.2;
            landMat.shininess = 100.0;
        } else {
            landMat.clr = vec3(0.08, 0.08, 0.05) * 1.2;
            landMat.dif = 1.0;
            landMat.spec = 1.2;
            landMat.shininess = 10.0;
        }
    }
    
    res = min(terrain, sphere);
    
    if (res < water) mat = landMat;
    else mat = waterMat;
    
    res = min(res, water);
    
    return res;
    
}

//*******************************************************//

vec3 calcNormal(in vec3 pt) {
    vec2 h = vec2(EPSILON, 0);
    Material m;
    // central difference sdf(pt + EPSILON) - sdf(pt - EPSILON)    
    return normalize(vec3(
       sdfScene(pt + h.xyy, m) - sdfScene(pt - h.xyy, m),
       sdfScene(pt + h.yxy, m) - sdfScene(pt - h.yxy, m),
       sdfScene(pt + h.yyx, m) - sdfScene(pt - h.yyx, m)
    ));
}

//*******************************************************//

float castRay(in vec3 ro, in vec3 rd, out Material mat) {
    
    // result
    float res = -1.0;
    // total distance traveled
    float td = 0.0;
    
    for (int i = 0; i < 230 && td < 10.0; i++) {
        Material m;
        float h = sdfScene(ro + td*rd, m);
        // if distance is really close, break
        if (h < EPSILON*td*2.5) {
           res = td;
           mat = m;
           break;
        }
        // add to total distance
        td += h;
    }
       
    return res;
    
}

float softShadow(in vec3 ro, in vec3 rd, in float k) {
    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    for (int i = 0; i < 256 && td < 60.0; i++) {
        Material m;
        float d = sdfScene(ro + td*rd, m);
        if (d < 0.001) {
            // intersection, so return shadow
            return 0.0;
        }
        res = min(res, k*d/td);
        td += d;
    }
    // if no intersection, no shadow -> 1.0
    return res;
}

float calcOcc(in vec3 pt, in vec3 nor) {

    float occ = 0.0;
    float scl = 1.0;
    
    Material m; // placeholder
    
    for (int i = 0; i < 4; i++) {
        float h = 0.01 + 0.07 * float(i);
        float d = sdfScene(pt + h * nor, m);
        occ += (h-d)*scl;
        scl *= 0.97;
    }
    
    return uclamp(1.0 - 2.0 * occ);
    
}

//*******************************************************//

vec3 applyFog(in vec3 rd, in float d, in vec3 clr, in vec3 sunClr, in vec3 sunDir, in vec3 skyClr) {
    vec3 fogClr = mix( skyClr, sunClr, pow(max(dot(rd, sunDir), 0.0), 15.0) );
    return mix(clr, fogClr, 1.0 - exp(-0.005 * d * d * d)); // fog
}

vec3 calcLighting(in vec3 pt, in vec3 rd, in vec3 nor, in Light light, in Material mat) {
    
    // diffuse
    float dif = uclamp(dot(nor, light.dir)) * mat.dif;
    
    // shadow
    float shadow = softShadow(pt, light.dir, light.shadowSoftness);
    
    // specular
    vec3 ref = reflect(light.dir, nor);
    float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

    // return dif * clr * shadow * spec + dif * clr * shadow; 
    return light.clr * shadow * dif * (spec + 1.0);
    
}

vec3 calcClr(in vec3 ro, in vec3 rd, in float d, in vec3 nor, in Material mat) {

    vec3 pt = ro + rd * d;

    // COLORS
    vec3 skyClr = vec3(0.005, 0.005, 0.015) * 8.0;
    
    // SUN LIGHT
    Light sun;
    sun.clr = vec3(15, 9, 4) * 0.4;
    sun.dir = normalize(vec3(0.5, 0.15, 0.5));
    sun.shadowSoftness = 20.9;
    
    // back sun light
    Light sun2;
    sun2.clr = sun.clr * 4.0;
    sun2.dir = normalize(vec3(0.3, 0.05, 1.5));
    sun2.shadowSoftness = 10.9;
    
    // background color
    vec3 clr = skyClr;
    
    // return background if too far
    if (d < 0.0) {
        // sun
        clr = mix(skyClr, sun2.clr * 0.05, pow(max(dot(rd, sun2.dir), 0.0), 2.0));
        clr = mix(clr, sun2.clr * 0.15, pow(max(dot(rd, sun2.dir), 0.0), 40.0));
        return clr;
    }
    
    clr = mat.clr;
    
    // bump map
    if (mat.id == 0.0) {
        nor += 0.2 * sin(20.0 * fractalNoise(pt * 5.0));
    } else if (mat.id == 1.0) {
        nor += 0.2 * fractalNoise(pt);
    }
    
    // LIGHTS
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor);
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat) * occ; // sun
    light += calcLighting(pt, rd, nor, sun2, mat) * occ; // sun2
    light += (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr * occ; // sky diffuse

    clr *= light;
    
    clr = applyFog(rd, d, clr, sun.clr * 0.1, sun.dir, skyClr);
    
    return clr;

}

//*******************************************************//

vec3 render(in vec3 ro, in vec3 rd) {
    
    Material mat;
    
    vec3 clr = vec3(0);
    
    vec3 fil = vec3(1.0);
    for (int i = 0; i < 4; i++) {
        // cast ray, return dist to closest object and material
        float d = castRay(ro, rd, mat);
        vec3 nor = calcNormal(ro + rd*d);
        // add to color
        clr += fil * calcClr(ro, rd, d, nor, mat);
        fil *= mat.ref;
        // break if we don't need to reflect
        if (mat.ref.r == 0.0 && mat.ref.g == 0.0 && mat.ref.g == 0.0) break;
        // update origin and reflect dir
        ro += rd*d + nor*EPSILON*3.0;
        if (i > 1) {
            rd = reflect(rd, nor);
        }
    }
    
    clr = pow(clr, vec3(1.0 / 2.2)); // gamma correction
    return clr;
    
}

//*******************************************************//

vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));
    // ray direction
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.2 * forward);
    return rd;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    //float time = iTime;
    //vec2 mouse = iMouse.xy;
    vec2 res = iResolution.xy;

    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    // target
    vec3 target = vec3(0, 0.0, 0);
    // ray origin
    vec3 ro = vec3(4.1, 0.5, -4.1);
    
    vec3 rd = setCamera(uv, ro, target);
    
    // calculate color based on distance, etc
    vec3 clr = render(ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
