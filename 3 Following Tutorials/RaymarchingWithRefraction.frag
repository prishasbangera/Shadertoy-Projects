/*

Raymarching Stuff with Refraction

Prisha B.
2021-10-16

Link: https://www.shadertoy.com/view/sdKSzh

Sources of learning and various utility functions mainly from Inigo Quilez's videos and articles.
Refraction: https://www.youtube.com/watch?v=NCpaaLkmXI8

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
    float IOR;
    bool isDielectric;
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

//*******************************************************//

// SDF SCENE

float map(in vec3 pt, out Material mat, in bool includeDielectrics) {

    // distance to closest object
    float res;
    
    // default
    mat.amb = 0.05;
    mat.clr = vec3(0.05);
    mat.dif = 1.0;
    mat.spec = 1.0;
    mat.shininess = 50.0;
    mat.ref = vec3(0.0);
    mat.id = -1.0;
    mat.isDielectric = false;
    
    
    // OPAQUE
    {
    
        // ground
        float ground = pt.y;

        // objects
        float objects;
        {
            objects = sdfBox(pt - vec3(0, 0.2, 0), vec3(2.9, 0.1, 2.9));
            vec3 p = pt - vec3(0.0, 1.5, 0.0);
            p = finRep(p, vec3(0.6), vec3(2.0, 0.0, 2.0));
            objects = min(objects, sdfSphere(p, 0.2));
        }

        // material and res
        
        res = min(ground, objects);

        if (res == ground) {
            mat.clr = vec3(0.01, 0.03, 0.05);
            mat.id = 0.0;
        } else if (res == objects) {
            mat.amb = 0.1;
            mat.clr = vec3(0.02, 0.01, 0.09);
            mat.spec = 2.0;
            mat.ref = vec3(0.2);
            mat.id = 1.0;
        }
        
    }
    
    // DIELECTRICS
    
    if (includeDielectrics) {
    
        // for dielectric materials, mat.ref is actually light absorbed
        
        vec3 p = pt;
        p.y -= pow(distance(p.xz, vec2(0.0)), 0.3);
        float d = sdfCapsule(p, vec3(-2, 2, -2), vec3(2, 2, 2), 0.2);
        d = smoothmin(d, sdfCapsule(p, vec3(2, 3, -2), vec3(-2, 3, 2), 0.2), 1.5);
        
        d = min(d, length(pt - vec3(0, 1.5, 0)) - 1.0);
    
        if (d < res) {
            res = d;
            mat.id = 2.0;
            mat.IOR = 1.52;
            mat.ref = vec3(0.7, 0.3, 0.2);
            mat.isDielectric = true;
        }
        
    }
    
    return res;
    
}

//*******************************************************//

vec3 calcNormal(in vec3 pt, in bool includeDielectrics) {
    vec2 h = vec2(EPSILON, 0);
    Material m;
    // central difference sdf(pt + EPSILON) - sdf(pt - EPSILON)    
    return normalize(vec3(
       map(pt + h.xyy, m, includeDielectrics) - map(pt - h.xyy, m, includeDielectrics),
       map(pt + h.yxy, m, includeDielectrics) - map(pt - h.yxy, m, includeDielectrics),
       map(pt + h.yyx, m, includeDielectrics) - map(pt - h.yyx, m, includeDielectrics)
    ));
}

//*******************************************************//

float castRay(in vec3 ro, in vec3 rd, out Material mat, in float side, in bool includeDielectrics) {

    // total distance traveled
    float td = 0.0;
    
    for (int i = 0; i < 256; i++) {
        float h = map(ro + td*rd, mat, includeDielectrics) * side;
        // if distance is really close, break
        if (abs(h) < (0.0001*td)) break;
        // add to total distance
        td += h;
        // if too far, break
        if (td >= MAX_DIST) {
            mat.id = -1.0;
            mat.ref = vec3(0.0);
            mat.isDielectric = false;
            break;
        }
    }
    
    return td;
    
}

float softShadow(in vec3 ro, in vec3 rd, in float k, in bool includeDielectrics) {
    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    for (int i = 0; i < 60 && td < MAX_DIST; i++) {
        Material m;
        float d = map(ro + td*rd, m, includeDielectrics);
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

float calcOcc(in vec3 pt, in vec3 nor, in bool includeDielectrics) {

    float occ = 0.0;
    float scl = 1.0;
    
    Material m; // placeholder
    
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.11 * 0.25 * float(i);
        float d = map(pt + h * nor, m, includeDielectrics);
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

vec3 calcLighting(in vec3 pt, in vec3 rd, in vec3 nor, in Light light, in Material mat, in bool includeDielectrics) {
    
    // diffuse
    float dif = uclamp(dot(nor, light.dir)) * mat.dif;
    
    // shadow
    float shadow = softShadow(pt, light.dir, light.shadowSoftness, includeDielectrics);
    
    // specular
    vec3 ref = reflect(light.dir, nor);
    float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

    // return dif * clr * shadow * spec + dif * clr * shadow; 
    return light.clr * shadow * dif * (spec + 1.0);
    
}

vec3 calcClr(in vec3 ro, in vec3 rd, in float d, in vec3 nor, in Material mat) {

    vec3 pt = ro + rd * d;

    // COLORS
    vec3 skyClr = vec3(0.5, 0.6, 0.7);
    
    // KEY LIGHT
    Light sun;
    sun.clr = vec3(9.8, 8.0, 6.7),
    sun.dir = normalize(vec3(0.8, 0.2, 0.5));
    sun.shadowSoftness = 10.9;
    
    // background color
    vec3 clr = vec3(0.0);
    
    // LIGHTS
    
    // return background if too far (id is -1.0)
    if (mat.id == -1.0) {
        // sun
        clr += mix(skyClr, sun.clr * 0.15, pow(max(dot(rd, sun.dir), 0.0), 50.0));
        return clr;
    }
    
    clr += mat.clr;
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor, true); //occ with dielectrics
    // float occ2 = calcOcc(pt, nor, false); // occ without dielectrics
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat, true) * occ; // sun
    light += (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr * occ; // sky diffuse

    clr *= light;
    
    clr = applyFog(rd, d, clr, sun.clr * 0.2, sun.dir, skyClr);
    
    return clr;

}

//*******************************************************//

vec3 renderOp(in vec3 ro, in vec3 rd) {
    
    Material mat;
    vec3 clr = vec3(0);

    float d = castRay(ro, rd, mat, 1.0, false);
    vec3 nor = calcNormal(ro + rd*d, false);
    
    // opaque color
    clr += calcClr(ro, rd, d, nor, mat);
    
    // reflections
    float h = d;
    if (mat.ref.r >= 0.0 || mat.ref.g >= 0.0 || mat.ref.b >= 0.0) {
        vec3 fil = vec3(1.0);
        vec3 ref = mat.ref;
        for (int i = 0; i < 5; i++) {
            fil *= ref;
            // to intersection point and reflect
            ro += rd*h + nor*EPSILON*3.0;
            rd = reflect(rd, nor);
            // find new point
            h = castRay(ro, rd, mat, 1.0, false);
            nor = calcNormal(ro + rd*h, false);
            clr += fil * calcClr(ro, rd, h, nor, mat);
            if (mat.id == -1.0) break;
        }
    }
    
    return clr;
    
}

vec3 render(in vec3 ro, in vec3 rd) {

    vec3 clr = vec3(0.0);

    // check for transparent objects
    Material mat;
    float d = castRay(ro, rd, mat, 1.0, true);
    
    if (mat.isDielectric) {
        
        float IOR = mat.IOR;
        ro += rd*d;
        vec3 nor = calcNormal(ro, true);
        
        // reflection and fresnel
        float fresnel = pow(1.0+dot(nor, rd), 5.0);
        vec3 reflectedDir = reflect(rd, nor);
        vec3 reflectedClr = renderOp(ro, rd);
        
        ro -= nor*EPSILON*3.0;
        rd = refract(rd, nor, 1.0/IOR);
        
        // check if opaque object in transparent material
        float opD = castRay(ro, rd, mat, 1.0, false);
        d = castRay(ro, rd, mat, -1.0, true);
        
        if (d < opD) {
        
            // outside pt
            ro += rd*d;
            nor = calcNormal(ro, true);
            vec3 rdOut = refract(rd, -nor, IOR);

            if (dot(rdOut,rdOut) == 0.0) {
                rd = reflect(rd, -nor);
            } else {
                rd = rdOut;
            }
            
            vec3 optDist = exp(-d * mat.ref); // optical distance
            
            vec3 refractedClr = renderOp(ro, rd) * optDist;
            
            clr = mix(refractedClr, reflectedClr, fresnel);
            
        } else {
            // render opaque material inside dielectric
            clr = renderOp(ro, rd);
        }
        
    } else {
        // render opaque color without refraction
        clr = renderOp(ro, rd);
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

    // float time = iTime;
    vec2 res = iResolution.xy;
    vec2 mouse = iMouse.xy/res.xy;

    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    // target
    vec3 target = vec3(0, 0, 0);
    // ray origin
    float movX = -10.0 * mouse.x + 5.0;
    float r = 4.5;
    vec3 ro = vec3(sin(movX) * r,  -10.0 * mouse.y + 10.0, cos(movX) * r);
    
    vec3 rd = setCamera(uv, ro, target);
    
    // calculate color based on distance, etc
    vec3 clr = render(ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
