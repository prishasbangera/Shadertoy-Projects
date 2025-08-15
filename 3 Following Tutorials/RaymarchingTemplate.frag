/*

Template

Prisha B.
2021-10-23

Link: https://www.shadertoy.com/view/ssVSRh

Learning from Inigo Quilez's videos and articles.
A sort of template.

Reflections, fresnel, point and directional lights, materials, fog, noise, etc.

*/

const float EPSILON = 0.001;
const float MAX_DIST = 60.0;
const int AA = 2;
const float FRESNEL_POWER = 5.0;

//*******************************************************//

// Light structs

struct Light {
    bool isPointLight;
    vec3 clr;
    float shadowSoftness;
    // if isPointLight, set position, else set direction
    vec3 pos;
    vec3 dir;
    float brightness;
};

// create a light
Light createLight(in vec3 pt, in bool isPointLight, in float fadeAdjust, in float shadowSoftness, in vec3 dirOrPos, in vec3 clr) {
    Light light;
    light.clr = clr;
    light.shadowSoftness = shadowSoftness;
    if (isPointLight) {
        light.pos = dirOrPos;
        light.isPointLight = true;
        float d = distance(pt, light.pos);
        d = pow(d, fadeAdjust);
        light.brightness = 1.0 / (d * d);
        light.dir = normalize(light.pos - pt);
    } else {
        light.brightness = 1.0;
        light.dir = dirOrPos;
    }
    return light;
}

// Material struct
struct Material {
    vec3 clr;
    float amb;
    float dif;
    float spec;
    float shininess;
    vec3 ref;
    bool hasFresnel;
    int id;
    vec3 groundBounceClr;
};

// return a nondescript material
Material defaultMaterial() {
    Material mat;
    mat.amb = 0.1;
    mat.clr = vec3(0.05);
    mat.dif = 1.0;
    mat.spec = 1.0;
    mat.shininess = 10.0;
    mat.ref = vec3(0.0);
    mat.hasFresnel = false;
    mat.id = -1;
    mat.groundBounceClr = vec3(0.0);
    return mat;
}

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

float noise(in vec2 pt) {
    
    vec2 h = vec2(0, 1);
    vec2 i = floor(pt); // integer component
    vec2 f = fract(pt); // fractional component
    f = 3.0 * f * f - 2.0 * f * f * f; // smooth interpolation
    
    // heights of four corners
    float a = random(i + h.xx),
          b = random(i + h.yx),
          c = random(i + h.xy),
          d = random(i + h.yy);
    
    // interpolate between four heights (basically mix function)
    return a + (b - a) * f.x + 
               (c - a) * f.y  +
               (a - b - c + d) * f.x * f.y;
          

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

float sdSphere(in vec3 pt, in float rad) {
    return length(pt) - rad;
}

float sdEllipsoid(in vec3 pt, in vec3 rad) {
    float k0 = length(pt/rad);
    float k1 = length(pt/(rad*rad));
    return k0 * (k0-1.0)/k1;
}

float sdCapsule(in vec3 pt, in vec3 a, in vec3 b, in float r) {
    vec3 apt = pt - a;
    vec3 ab = b - a;
    float t = clamp(dot(apt, ab) / dot(ab, ab), 0.0, 1.0);
    return length( apt - ab * t ) - r;
}

float sdBox(vec3 pt, vec3 b) {
	vec3 q = abs(pt) - b;
	return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

//*******************************************************//

// SDF SCENE

float sdf(in vec3 pt, out Material mat) {

    // distance to closest object
    float res = pt.y;
    
    // default
    mat = defaultMaterial();
    
    // ground
    {
        res = pt.y - 0.1 * noise(pt);
        mat.id = 0;
        mat.hasFresnel = false;
        mat.clr = vec3(0.03, 0.2, 0.1) * 0.1;
    }
    
    // platform
    {
        float p = sdBox(pt, vec3(2.9, 0.1, 2.9));
        if (p < res) {
            res = p;
            mat.amb = 0.1;
            mat.clr = vec3(0.02, 0.01, 0.09);
            mat.spec = 2.0;
            mat.ref = vec3(0.2);
            mat.id = 1;
            if (sin(pt.x * 10.0) < 0.0) mat.hasFresnel = true;
            if (cos(pt.x * 10.0) < 0.0) mat.hasFresnel = false;
            if (sin(pt.z * 10.0) < 0.0) mat.ref = vec3(0.0);
        }
    }
    
    // sphere
    {
        float s = length(pt - vec3(-3, 3, 1)) - 1.0;
        if (s < res) {
            res = s;
            mat.id = 2;
            mat.ref = vec3(1.0);
            mat.clr = vec3(0.1, 0.1, 0.2);
            mat.spec = 0.4;
            mat.dif = 0.0;
            mat.hasFresnel = true;
        }
        
    }
    
    return res;
    
}

//*******************************************************//

vec3 calcNormal(in vec3 pt) {
    vec2 h = vec2(EPSILON, 0);
    Material m;
    // central difference sdf(pt + EPSILON) - sdf(pt - EPSILON)    
    return normalize(vec3(
       sdf(pt + h.xyy, m) - sdf(pt - h.xyy, m),
       sdf(pt + h.yxy, m) - sdf(pt - h.yxy, m),
       sdf(pt + h.yyx, m) - sdf(pt - h.yyx, m)
    ));
}

//*******************************************************//

float castRay(in vec3 ro, in vec3 rd, out Material mat) {

    // total distance traveled
    float td = 0.0;
    
    for (int i = 0; i < 100; i++) {
        float h = sdf(ro + td*rd, mat);
        // if distance is really close, break
        if (abs(h) < (0.0001*td)) break;
        // add to total distance
        td += h;
        // if too far, break
        if (td >= MAX_DIST) {
            mat.id = -1;
            mat.ref = vec3(0.0);
            mat.hasFresnel = false;
            break;
        }
    }
    
    return td;
    
}

float softShadow(in vec3 ro, in vec3 rd, in float k) {
    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    for (int i = 0; i < 200 && td < MAX_DIST; i++) {
        Material m;
        float d = sdf(ro + td*rd, m);
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
        float d = sdf(pt + h * nor, m);
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
    float shadow = light.isPointLight ? 1.0 : softShadow(pt, light.dir, light.shadowSoftness);
    
    // specular
    vec3 ref = reflect(light.dir, nor);
    float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

    // return dif * clr * shadow * spec + dif * clr * shadow; 
    return light.brightness * light.clr * shadow * dif * (spec + 1.0);
    
}

vec3 calcClr(in vec3 ro, in vec3 rd, in float d, in vec3 nor, in Material mat) {

    vec3 pt = ro + rd * d;

    // COLORS
    vec3 skyClr = vec3(0.5, 0.6, 0.7);
    
    // KEY LIGHT
    Light sun = createLight(pt, false, 1.0, 10.9, normalize(vec3(8, 3, 10)), vec3(9.8, 8.0, 6.7));
    Light ptLight = createLight(pt, true, 1.5, 5.9, vec3(-5, 1, 5), vec3(50.0));
    
    // background color
    vec3 clr = skyClr;

    // return background if too far (id is -1.0)
    if (mat.id == -1) {
        // sun
        clr = mix(skyClr, sun.clr * 0.15, pow(max(dot(rd, sun.dir), 0.0), 50.0));
        return clr;
    }
    
    clr = mat.clr;
    
    // LIGHTS
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor);
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat) * occ; // sun
    light += calcLighting(pt, rd, nor, ptLight, mat) * occ; //p
    light += (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr * occ; // sky diffuse

    clr *= light;
    
    clr = applyFog(rd, d, clr, sun.clr * 0.1, sun.dir, skyClr);
    
    return clr;

}

//*******************************************************//

vec3 render(in vec3 ro, in vec3 rd) {
    
    Material mat;

    float d = castRay(ro, rd, mat);
    vec3 nor = calcNormal(ro + rd*d);
    
    vec3 clr = calcClr(ro, rd, d, nor, mat);
    
    bool willReflect = mat.ref.r > 0.0 || mat.ref.g > 0.0 || mat.ref.b > 0.0;
    if (mat.hasFresnel || willReflect) {
    
        int bounces = 1;
        vec3 ref = vec3(0.0);
        float fresnel = 0.5 * uclamp(pow(1.0 - dot(nor, -rd), FRESNEL_POWER));
        
        // if the material will reflect
        if (willReflect) {
            bounces = 3;
            // if reflective and doesn't have fresnel
            if (!mat.hasFresnel) ref = mat.ref;
            // if reflective with fresnel
            else ref = fresnel * mat.ref;
        } else {
            ref = vec3(fresnel);
        }
        
        // bouncing around for fresnel and reflection
        vec3 fil = vec3(1.0);
        for (int i = 0; i < bounces; i++) {
            fil *= ref;
            // to intersection point and reflect
            ro += rd*d + nor*EPSILON*3.0;
            rd = reflect(rd, nor);
            // find new point
            d = castRay(ro, rd, mat);
            nor = calcNormal(ro + rd*d);
            // add color
            clr += fil * calcClr(ro, rd, d, nor, mat);
            if (mat.id == -1) break;
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
    
    // target
    vec3 target = vec3(0, 0.5, 0);
    // ray origin
    float movX = -10.0 * mouse.x/res.x + 5.0;
    float r = 4.5;
    vec3 ro = target + vec3(sin(movX) * r,  -10.0 * mouse.y/res.y + 10.0, cos(movX) * r);
    
    // accumulate color
    vec3 clr = vec3(0.0);
    
    for (int i = 0; i < AA; i++) {
        for (int j = 0; j < AA; j++) {
            // Normalized pixel coordinates
            vec2 f = fragCoord + vec2(float(i), float(j)) / float(AA);
            vec2 uv = (2.0*f - res) / min(res.x, res.y);
            vec3 rd = setCamera(uv, ro, target);
            // calculate color based on distance, etc
            clr += render(ro, rd);
        }
    }    
    
    clr /= float(AA*AA);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
