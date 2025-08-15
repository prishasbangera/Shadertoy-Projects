/*

Swirly Swirls

Prisha B.
2024-04-01

Link: https://www.shadertoy.com/view/msdBWl

*/

const float EPSILON = 0.001;
const float MAX_DIST = 64.0;
const int AA = 3;
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

float fractalNoise(in vec2 uv) {
    float c = noise(uv * 4.0);
    c += 0.5 * noise(uv * 8.0);
    c += 0.25 * noise(uv * 16.0);
    c += 0.125 * noise(uv * 32.0);
    c += 0.0625 * noise(uv * 64.0);
    c /= 2.0;
    return c;
}

//*******************************************************//

// SDF SCENE

float sdf(in vec3 pt, out Material mat) {

    // distance to closest object
    float res = pt.y;
    
    // default
    mat = defaultMaterial();
    
    mat.id = 0;
    res -= fractalNoise(vec2(atan(pt.z + 2.0, pt.x + 10.0)/2.0, 3.-length(pt)));
    mat.clr = vec3(0.02, 0.015, 0.04);
        mat.clr = mix(mat.clr, 0.1*vec3(0.4, 0.7, 0.6), smoothstep(0.1, 0.6, pt.y*pt.y));
    mat.hasFresnel = true;
    mat.spec = 2.10;
    
    res *= 0.6;
   
       float bestNum = random(floor(length(pt.xz) * 10.0));
    if (bestNum > 0.65) {
        mat.id = 0;
        //mat.hasFresnel = false;
    
        mat.clr = vec3(0.15, 0.05, 0.1) * 0.1;
        mat.clr = mix(mat.clr, 0.1*vec3(1.5, 0.8, 0.2), smoothstep(0.0, 0.2, pt.y*pt.y));
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
    vec3 skyClr = vec3(1., 0.2, 0.2);
    
    // KEY LIGHT
    Light sun = createLight(pt, false, 1.0, 10.9, normalize(vec3(2.5, 0.35, 2.0)), vec3(19.8, 6.0, 4.7));
    Light ptLight = createLight(pt, true, 0.9, 10.9, vec3(-1, 2, 2), mat.clr*4.0*vec3(10.0, 10, 8));
    Light ptLight2 = createLight(pt, true, 7.0, 10.9, vec3(0, 1.4, 0), 10.0*vec3(10.0, 10, 5));
    
    // background color
    vec3 clr = skyClr;

    // return background if too far (id is -1.0)
    if (mat.id == -1) {
        // sun
        clr = mix(skyClr, sun.clr * 0.2, pow(max(dot(rd, sun.dir), 0.0), 80.0));
        return clr;
    }
    
    clr = mat.clr;
    
    // water
    if (mat.id == 1) {
        mat.ref = skyClr;
    }
    
    // LIGHTS
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor);
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat) * occ; // sun
    light += calcLighting(pt, rd, nor, ptLight, mat) * occ * 0.8; //p
    light += calcLighting(pt, rd, nor, ptLight2, mat) * occ * 0.8; //p

    light += 0.9 * (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr * occ; // sky diffuse

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

    if (iFrame != 0) discard;

    float time = iTime;
    vec2 mouse = iMouse.xy;
    vec2 res = iResolution.xy;
    
    // target
    vec3 target = vec3(0, -1.0, 0);
    // ray origin
    //float movX = -10.0 * mouse.x/res.x + 5.0;
    //float r = 4.5;
    //vec3 ro = target + vec3(sin(movX) * r,  -10.0 * mouse.y/res.y + 10.0, cos(movX) * r);
    vec3 ro = target + vec3(-3.0, 2.9, 1.3);
    
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
