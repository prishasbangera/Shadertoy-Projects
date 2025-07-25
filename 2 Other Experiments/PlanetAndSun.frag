/*

Planet and Sun

Prisha B.
Date unknown

Link: https://www.shadertoy.com/view/fdVSWw

Sources for learning:
https://iquilezles.org/
https://thebookofshaders.com/

*/

const float EPSILON = 0.001;
const float MAX_DIST = 60.0;

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

// SMOOTH MIN from Inigo Quilez (IQ)
float smoothmin(in float a, in float b, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

// smoothmax from IQ
float smoothmax( float a, float b, float k ) {
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}

// Smooth min for distance and color (IQ)
vec4 smoothmin(in float a, in float b, in vec3 clr1, in vec3 clr2, in float k) {
   float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
   float d = mix(b, a, h) - k*h*(1.0-h);
   vec3 c = mix(clr2, clr1, h);
   return vec4(c, d);
}

// return points for finite and infinite repetition (IQ)

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

float sdfEllipsoid(in vec3 pt, in vec3 rad) {
    float k0 = length(pt/rad);
    float k1 = length(pt/(rad*rad));
    return k0 * (k0-1.0)/k1;
}

float sdfCapsule(in vec3 pt, in vec3 a, in vec3 b, in float r) {
    vec3 apt = pt - a;
    vec3 ab = b - a;
    float t = clamp(dot(apt, ab) / dot(ab, ab), 0.0, 1.0);
    return length( apt - ab * t ) - r;
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
    mat.amb = 0.2;
    mat.dif = 1.0;
    mat.spec = 1.0;
    mat.ref = vec3(0);
    mat.shininess = 50.0;
    mat.clr = vec3(0.05);
    
    // distance to closest object
    float res;
    
    vec3 r = vec3(2);
    float water = sdfEllipsoid(pt, r);
    float land = sdfEllipsoid(pt, r-0.08);
        vec3 p = pt;
        float scl = 1.0;
        for (int i = 0; i < 6; i++) {
            float n = scl*sdfBase(p);
            n = smoothmax(n, land - scl*0.1, scl*0.3);
            land = smoothmin(land, n, scl*0.3);
            p = mat3(
                 0.00, 1.60, 1.20,
                -1.60, 0.72,-0.96,
                -1.20,-0.96, 1.28
            ) * p;
            scl *= 0.5;
        }
    
    // material and closest distance
    res = min(land, water);
    
    if (res == water) {
        mat.clr = vec3(0.01, 0.03, 0.05);
        mat.shininess = 100.0;
        mat.ref = vec3(0.1, 0.4, 0.6);
        mat.dif = 0.3;
        mat.id = 0.0;
    } else if (res == land) {
        mat.clr = vec3(0.05, 0.1, 0.06) * 0.3;
        mat.shininess = 10.0;
        mat.spec = 0.2;
        mat.id = 1.0;
    }
    
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

float castRay(in vec3 ro, in vec3 rd, out Material mat, in float side) {

    // total distance traveled
    float td = 0.0;
    
    for (int i = 0; i < 256; i++) {
        float h = sdfScene(ro + td*rd, mat) * side;
        // if distance is really close, break
        if (abs(h) < (0.0001*td)) break;
        // add to total distance
        td += h;
        // if too far, break
        if (td >= MAX_DIST) {
            mat.id = -1.0;
            mat.ref = vec3(0.0);
            break;
        }
    }
    
    return td;
    
}

float softShadow(in vec3 ro, in vec3 rd, in float k) {
    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    for (int i = 0; i < 60 && td < 20.0; i++) {
        Material m;
        float d = sdfScene(ro + td*rd, m);
        if (d < 0.001) {
            // intersection, so return shadow
            return 0.0;
        }
        res = min(res, k*d/td);
        td += d;
    }
    // if no intersection -> shadow 0.0 to light 1.0
    return res;
}

float calcOcc(in vec3 pt, in vec3 nor) {

    float occ = 0.0;
    float scl = 1.0;
    
    Material m; // placeholder
    
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.11 * 0.25 * float(i);
        float d = sdfScene(pt + h * nor, m);
        occ += (h-d)*scl;
        scl *= 0.95;
    }
    
    return uclamp(1.0 - 2.0 * occ);
    
}

//*******************************************************//

vec3 applyFog(in vec3 rd, in float d, in vec3 clr, in vec3 sunClr, in vec3 sunDir, in vec3 skyClr) {
    vec3 fogClr = mix( skyClr, sunClr, pow(max(dot(rd, sunDir), 0.0), 15.0) );
    return mix(clr, fogClr, 1.0 - exp(-0.00001 * d * d * d)); // fog
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
    vec3 skyClr = vec3(0.03, 0.02, 0.04) * 0.1;
    
    // KEY LIGHT
    Light sun;
    sun.clr = vec3(9.8, 8.0, 6.7) * 2.0;
    sun.dir = normalize(vec3(0.05, 0.03, 0.0));
    sun.shadowSoftness = 10.9;
    
    // shine
    vec3 clr = sun.clr * 0.1 * pow(max(dot(rd, sun.dir), 0.0), 50.0); 

    // return background if too far (id is -1.0)
    if (mat.id == -1.0) {
        return skyClr + clr;
    }
    
    // textures
    if (mat.id == 0.0) {
        mat.clr *= vec3(0.2, 0.2, 0.5)*texture(iChannel0, (nor.xy * 0.5 + 0.5)).rgb;
    } else if (mat.id == 1.0) {
        mat.clr = 0.05*texture(iChannel1, 0.5 * (nor.xy * 0.5 + 0.5)).rgb;
        mat.clr.g *= 2.0;
    }
    
    clr += mat.clr;
    
    // LIGHTS
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor);
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat) * occ; // sun

    clr *= light;
    
    // clr = applyFog(rd, d, clr, sun.clr * 0.1, sun.dir, skyClr);
    
    return clr;

}

//*******************************************************//

vec3 render(in vec3 ro, in vec3 rd) {
    
    Material mat;
    vec3 clr = vec3(0);

    float d = castRay(ro, rd, mat, 1.0);
    vec3 nor = calcNormal(ro + rd*d);
    
    clr += calcClr(ro, rd, d, nor, mat);
    
    if (mat.ref.r >= 0.0 || mat.ref.g >= 0.0 || mat.ref.b >= 0.0) {
        vec3 fil = vec3(1.0);
        vec3 ref = mat.ref;
        for (int i = 0; i < 5; i++) {
            fil *= ref;
            // to intersection point and reflect
            ro += rd*d + nor*EPSILON*3.0;
            rd = reflect(rd, nor);
            // find new point
            d = castRay(ro, rd, mat, 1.0);
            nor = calcNormal(ro + rd*d);
            clr += fil * calcClr(ro, rd, d, nor, mat);
            if (mat.id == -1.0) break;
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

    float time = iTime;
    vec2 mouse = iMouse.xy;
    vec2 res = iResolution.xy;

    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    // target
    vec3 target = vec3(0, 2.1, 0);
    // ray origin
    vec3 ro = target + vec3(-2.0, 0, 0);
   
    vec3 rd = setCamera(uv, ro, target);
    
    // calculate color based on distance, etc
    vec3 clr = render(ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
