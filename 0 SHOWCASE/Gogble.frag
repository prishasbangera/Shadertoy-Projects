/*

Gogble

Prisha B.

2022-05-24

Live code: https://www.shadertoy.com/view/fdcyDH

Sources for learning in code

*/


const float EPSILON = 0.001;
const float MAX_DIST = 60.0;
const int AA = 2;
const float FRESNEL_POWER = 4.5;
const int REF_BOUNCES = 1;

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

float noise(in vec2 uv) {
    
	vec2 fid = fract(uv); // fraction part of uv -> where in the grid
	fid = fid * fid * (3.0 - 2.0 * fid);
	vec2 id = floor(uv); // integer part of uvw -> which grid
	
	// corners of square
	float bl = random(id + vec2(0, 0));
	float br = random(id + vec2(1, 0));
	float tl = random(id + vec2(0, 1));
	float tr = random(id + vec2(1, 1));
	
	// interpolate between corner
	float b = mix(bl, br, fid.x);
	float t = mix(tl, tr, fid.x);
	return mix(b, t, fid.y);
    
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

//*******************************************************//

// SDFs

float sdCapsule(in vec3 pt, in vec3 a, in vec3 b, in float r) {
    vec3 apt = pt - a;
    vec3 ab = b - a;
    float t = clamp(dot(apt, ab) / dot(ab, ab), 0.0, 1.0);
    return length( apt - ab * t ) - r;
}


//*******************************************************//

// SDF SCENE

float sdf(in vec3 pt, out Material mat) {

    // distance to closest object
    float res = MAX_DIST;
    
    // default
    mat = defaultMaterial();
    
    {
        
        // sphere
        float l = length(pt) - 3.0 - 0.2*cos(4.0*pt.x*pt.y+ iTime*8.0);
        if (l < res) {
            res = l;
            mat.id = 3;
            mat.amb = 0.01;
            mat.dif = 0.5;
            mat.spec = 10.0;
            mat.hasFresnel = true;
            mat.shininess = 10.0;
            mat.ref = vec3(1.0);
            mat.clr = vec3(0.08) * 0.05;
        }
        
    }
    
    return res;
    
}

//*******************************************************//

// https://iquilezles.org/articles/normalsSDF
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

// https://iquilezles.org/articles/rmshadows
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

// https://www.shadertoy.com/view/3lsSzf
// ambient occlusion
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

// https://iquilezles.org/articles/fog
vec3 applyFog(in vec3 rd, in float d, in vec3 clr, in vec3 sunClr, in vec3 sunDir, in vec3 skyClr) {
    vec3 fogClr = mix( skyClr, sunClr, pow(max(dot(rd, sunDir), 0.0), 15.0) );
    return mix(clr, fogClr, 1.0 - exp(-0.00005 * d * d * d)); // fog
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
    vec3 skyClr = vec3(0.45, 0.2, 0.35) * 1.5;
    
    // KEY LIGHT
    Light sun = createLight(pt, false, 1.0, 10.9, normalize(vec3(10, 12.5, 3)), vec3(10, 9, 8));
    
    // background color
    vec3 clr = skyClr;

    // return background if too far (id is -1.0)
    if (mat.id == -1) {// sun
        // clr = mix(skyClr, sun.clr * 0.12, pow(max(dot(rd, sun.dir), 0.0), 50.0));
        return clr;
    }
    
    clr = mat.clr;
    
    // LIGHTS
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor);
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat); // sun
    light += (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr; // sky diffuse

    clr *= light * occ;
    
    // clr = applyFog(rd, d, clr, sun.clr * 0.1, sun.dir, skyClr);
    
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
            bounces = REF_BOUNCES;
            // if reflective and doesn't have fresnel
            if (!mat.hasFresnel) ref = mat.ref;
            // if reflective with fresnel
            else ref = fresnel * mat.ref;
        } else {
            ref = vec3(fresnel);
        }
        
        // bouncing around for fresnel and reflection
        vec3 fil = vec3(1.0);
        if (fresnel > 0.0) {
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

    float time = iTime * 0.3;
    vec2 res = iResolution.xy;
    
    // target
    vec3 target = vec3(0, 0, 0);
    // ray origin
    vec3 ro = vec3(0, 0, 6);
    float r = 6.0;
    ro = vec3(r * cos(time), 0, r * sin(time));
    
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
