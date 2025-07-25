/*

Code Cake

Prisha B.
2022-10-13

Live code: https://www.shadertoy.com/view/cdlGRn

Sources specified in code
- Featuring reflections, fresnel, and more

Reel on IG: https://www.instagram.com/reel/Cjqqkhtjtl-/?utm_source=ig_web_copy_link


*/

const float EPSILON = 0.001;
const float MAX_DIST = 60.0;
const int AA = 2; // sqrt(samples per pixel)

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

// SMOOTH MIN from Inigo Quilez
float smoothmin(in float a, in float b, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

// smoothmax
float smoothmax(float a, float b, float k) {
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}

//*******************************************************//

float sdCake(in vec3 pt, out Material mat) {
    mat.id = 0;
    float res = length(pt.xz) - 2.2 - 0.4*smoothstep(2.5, 0.0, pt.y);
    res = smoothmax(res, pt.y - 2.5, 0.6);
    res = smoothmax(res, -pt.y-0.2, 0.2);
    return res;
}

float sdCherries(in vec3 pt, in float rad, out Material mat) {
    mat.id = 1;
    float angBetween = 6.283185/9.0; // two PI divided by num of cherries
    float sec = round(atan(pt.z, pt.x)/angBetween);
    float rot = sec * angBetween;
    vec3 p = pt - vec3(0, 2.85, 0);
    p *= vec3(1, 1.1, 1);
    p.xz = mat2(cos(rot), -sin(rot), 
                 sin(rot), cos(rot))*p.xz;
    float res = length(p - vec3(1.5, 0.0, 0.0)) - rad;
    return res;
}

float sdPlate(in vec3 pt, out Material mat) {
    mat.id = 2;
    mat.ref = vec3(0.1, 0.1, 0.2);
    // outer
    float res = length(pt.xz) - 3.1;
    res = smoothmax(res, abs(pt.y) - 0.05, 0.03);
    // inner
    float inner = length(pt.xz) - 2.9;
    inner = smoothmax(inner, abs(pt.y - 0.03) - 0.03, 0.03); 
    res = smoothmax(res, -inner, 0.05);
    return res;
}

float sdFrosting(in vec3 pt, out Material mat) {
    mat.id = 3;
    float ang = atan(pt.z, pt.x);
    float a = 2.4;
    float res = length(pt.xz) - a - 0.05*sin(15.0 * ang);
    vec3 p = pt - vec3(0, 2.6 - 0.7*smoothstep(a-0.3, a+0.1, length(pt.xz)), 0);
    res = smoothmax(res, abs(p.y) - 0.2, 0.2);
    // cherries cut out
    Material m;
    res = smoothmax(res, -sdCherries(pt, 0.24, m), 0.08);
    return res*0.35;
}



//*******************************************************//

// SDF SCENE

float sdf(in vec3 pt, out Material mat) {

    // distance to closest object
    float res = MAX_DIST;
    
    // default
    mat = defaultMaterial();
    
    // plate
    Material plateMat = defaultMaterial();
    float plate = sdPlate(pt, plateMat);
    
    // cake
    Material cakeMat = defaultMaterial();
    float cake = sdCake(pt, cakeMat);
    
    // frosting
    Material frostingMat = defaultMaterial();
    float frosting = sdFrosting(pt, frostingMat);
    
    // cherries
    Material cherriesMat = defaultMaterial();
    float cherries = sdCherries(pt, 0.23, cherriesMat);
    
    if (cake < res) {
        res = cake;
        mat = cakeMat;
    }
    
    if (frosting < res) {
        res = frosting;
        mat = frostingMat;
    }
    
    if (cherries < res) {
        res = cherries;
        mat = cherriesMat;
    }
    
    mat.hasFresnel = true;
    
    if (plate < res) {
        res = plate;
        mat = plateMat;
        mat.hasFresnel = false;
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
    
    // shadow (has tint)
    vec3 shadow = light.isPointLight ? vec3(1.0) : vec3(1.0, 0.8, 0.9) * softShadow(pt, light.dir, light.shadowSoftness);
    
    // specular
    vec3 ref = reflect(light.dir, nor);
    float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

    // return dif * clr * shadow * spec + dif * clr * shadow; 
    return light.brightness * light.clr * shadow * dif * (spec + 1.0);
    
}

vec3 calcClr(in vec3 ro, in vec3 rd, in float d, in vec3 nor, in Material mat) {

    vec3 pt = ro + rd * d;

    // COLORS
    vec3 skyClr = vec3(0.55, 0.25, 0.55);
    
    // KEY LIGHT
    Light sun = createLight(pt, false, 1.0, 10.9, normalize(vec3(10, 12.5, 3)), vec3(9, 8, 9)+5.0*skyClr);
    
    // background color
    vec3 clr = skyClr;

    if (mat.id == -1) {
        // return background if too far (id is -1.0)
        return clr;
    } else if (mat.id == 0) {
        // cake
        mat.clr = vec3(0.06, 0.06, 0.02);
    } else if (mat.id == 1) {
        // cherry
        mat.clr = vec3(0.15, 0.02, 0.01)*0.9;
        mat.shininess = 100.0;
        mat.dif = 0.3;
        mat.amb = 0.0;
        mat.spec = 10.0;
    } else if (mat.id == 2) {
        // plate
        mat.clr = vec3(0.04, 0.05, 0.1);
        mat.dif = 0.5;
        mat.shininess = 20.0;
        mat.spec = 20.0;
    } else if (mat.id == 3) {
        // frosting
        mat.clr = vec3(0.05, 0.02, 0.01) * 0.07;
    }
    
    clr = mat.clr;
    
    // LIGHTS
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor);
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat); // sun
    light += (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr; // sky diffuse

    clr *= light * occ;
    
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
        float fresnel = 0.4 * uclamp(pow(1.0 - dot(nor, -rd), 5.0));
        
        // if the material will reflect
        if (willReflect) {
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

    vec2 res = iResolution.xy;
    
    // target
    vec3 target = vec3(0, 0.5, 0);
    // ray origin
    float r = 5.5;
    float t = iTime * 0.2;
    vec3 ro = vec3(r * cos(t), 3.7, r * sin(t));
    
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
