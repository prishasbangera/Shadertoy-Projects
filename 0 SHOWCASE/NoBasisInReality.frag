/*

no basis in reality
(raymarched noisy planet)

Prisha B.
2021-09-13

Link: https://www.shadertoy.com/view/NdKGRz

Sources:
Inigo Quilez's website and videos.
https://learnopengl.com/
The Book of Shaders: https://thebookofshaders.com/


*/

const float EPSILON = 0.001;

// clamp value from 0 to 1
float uclamp(float val) {
    return clamp(val, 0.0, 1.0);
}

// SMOOTH MIN from Inigo Quilez
float smoothmin(in float a, in float b, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

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


// SDF SCENE
// materials
// -1.0 -> sky
// 0.0 -> grass

vec4 sdfScene(in vec3 pt) {

    float time = iTime;
    
    vec4 res = vec4(1000.0, -1.0, 0.0, 1.0);
    
    // water?
    {
        float water = sdfSphere(pt, 1.12) + 0.01 * (
            sin(pt.x * 20.0 + sin(pt.y * 30.0) * 0.8) * 
            sin(pt.y * 20.0 + sin(pt.x * 10.0)) * 
            sin(pt.z * 20.0 + sin(pt.x * 10.0))
        ) - 0.05 * fractalNoise(pt);
        if(water > 2.0) return res;
        if (water < res.x) {
            res.y = 0.0;
        }
        res.x = min(res.x, water);
    }
    
    // planet
    {
        float ground = 0.5 * sdfSphere(pt, 0.9) - 0.3 * fractalNoise(pt * 0.7);// - 0.05 * noise(pt);
        ground -= 0.05 * sin(pt.x * 10.0) * sin(pt.y * 10.0) * sin(pt.z * 10.0);
        if (ground < res.x) {
            res.y = 1.0;
        }
        res.x = min(res.x, ground);
    }
    
    return res;
    
}

vec3 calcNormal(in vec3 pt) {
    vec2 h = vec2(EPSILON, 0);
    // central difference sdf(pt + EPSILON) - sdf(pt - EPSILON)    
    return normalize(vec3(
       sdfScene(pt + h.xyy).x - sdfScene(pt - h.xyy).x,
       sdfScene(pt + h.yxy).x - sdfScene(pt - h.yxy).x,
       sdfScene(pt + h.yyx).x - sdfScene(pt - h.yyx).x
    ));
}

vec4 castRay(in vec3 ro, in vec3 rd) {
    
    // result
    // res.x = closest distance
    // res.y = material
    // res.z
    // res.w
    vec4 res = vec4(-1.0, -1.0, 0.0, 1.0);
    // total distance traveled
    float td = 0.0;
    
    for (int i = 0; i < 256 && td < 60.0; i++) {
        vec4 h = sdfScene(ro + td*rd);
        // if distance is really close, break
        if (abs(h.x) < (0.0001*td)) {
           res = vec4(td, h.yzw);
           break;
        }
        // add to total distance
        td += h.x;
    }
       
    return res;
    
}

float smoothShadow(in vec3 ro, in vec3 rd, in float k) {
    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    for (int i = 0; i < 256 && td < 60.0; i++) {
        float d = sdfScene(ro + td*rd).x;
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

vec3 calcLighting(in vec3 pt, in vec3 rd, in vec3 nor, in vec3 lightDir, in vec3 clr, in float shininess, in float shadowK) {
    float dif = uclamp(dot(nor, lightDir));
    float shadow = smoothShadow(pt, lightDir, shadowK);
    vec3 ref = reflect(lightDir, nor);
    float spec = pow(uclamp(dot(rd, ref)), shininess);
    // return  dif * clr * shadow * spec + dif * clr * shadow; 
    return  dif * clr * shadow * (spec + 1.0);
}

vec3 calcClr(in vec3 ro, in vec3 rd) {

    // cast ray, return dist to closest object and material
    // obj.x = distance, obj.y = material index
    // obj.z = , obj.w = 
    vec4 res = castRay(ro, rd);
    vec3 pt = ro + res.x*rd;
    
    float time = iTime;
    
    // COLORS
    vec3 planetClr = vec3(0.08, 0.01, 0.13);
    vec3 skyClr = vec3(0.05, 0.18, 0.45) * 0.01;
    vec3 waterClr = vec3(0.335, 0.214, 0.147);
    
    // background color
    vec3 clr = skyClr;
    
    // return background if too far
    if (res.x < 0.0) return clr;
    
    float mat = res.y; // material
    float shininess = 5.0;
    vec3 nor = calcNormal(pt);
    
    if (mat == 0.0) {
        clr = waterClr;
        shininess = 200.0;
    } else if (mat == 1.0) {
        shininess = 100.0;//(pow(random(pt), 2.0) * 2.0 - 1.0) * 50.0 + 100.0;
        clr = planetClr - 0.1*fractalNoise(pt);// -  sin(pt.x * 7.0) * sin(pt.x * 5.0) * sin(pt.y * 10.0) * vec3(0.1, 0.02, 0.04) * fractalNoise(pt) * vec3(0.4, 0.2, 0.9);
    }
    
    if (mat == 0.0 || mat == 1.0) {
        float k = uclamp( 
            sin(pt.y * (40.0 + 10.0*(1.0 + sin(pt.y * 20.0))) + 
            sin(pt.z * 30.0 + sin(pt.x * 10.0))) 
        );
        vec3 c = vec3(
            0.1 + 0.31 * sin(pt.y * 10.0), 
            0.1 + 0.05 * sin(pt.z * 10.0), 
            0.08 + 0.02 * sin(pt.z * 20.0)
        );
        clr += k * c * (0.8 - 0.6*mat);
        clr *= 0.3;
    }
    
    // LIGHTS
    
    vec3 sunClr = 0.4 * vec3(9.8, 6.0, 5.5);
    vec3 moonClr = vec3(2.13, 2.40, 3.46) * 0.5;
    
    vec3 sunDir = normalize(vec3(0.6, 0.55, 0.5) * 2.0 - pt); // directional
    vec3 moonDir = normalize(vec3(-0.6, 0.0, -0.5) * 3.0 - pt);
   
    // CALCULATE COLOR
    vec3 light = vec3(0.01);
    light += calcLighting(pt, rd, nor, sunDir, sunClr, shininess, 10.0);
    light += calcLighting(pt, rd, nor, moonDir, moonClr, shininess, 4.0);
    // misc lights
    light += 0.5 * calcLighting(
        pt, rd, nor, 
        normalize(vec3(0.5, -0.2, 0.1) * 2.5 - pt), 0.5 * vec3(5, 2, 1),
        shininess, 6.0
    ); // orangey
    light += 0.5 * calcLighting(
        pt, rd, nor,
        normalize(vec3(0.0, 0.2, 0.5) * 2.3 - pt),
        0.5 * vec3(8, 2, 4), shininess, 3.0
    ); // red
    light += calcLighting(
        pt, rd, nor,
        normalize(vec3(1.9, 0.6, -0.9) * 0.62 - pt),
        0.5 * vec3(4, 5, 2), shininess, 9.0
    ); // yellow
    light += calcLighting(
        pt, rd, nor,
        normalize(vec3(-0.5, -0.2, 0.1) * 2.5 - pt),
        vec3(1, 5, 3), shininess, 10.0
    ); // blue green
    light += calcLighting(
        pt, rd, nor,
        normalize(vec3(0.0, 0.0, -0.5) * 3.0 - pt),
        0.5 * vec3(6, 5, 4.5), shininess, 8.0
    ); // pinkish
    // misc moving lights
    light += calcLighting(
        pt, rd, nor,
        normalize(vec3(0.2 + 0.4*sin(time * 5.0), -0.2 + 0.4*sin(time * 2.0), 0.5 - cos(time)) * 1.2 - pt),
        vec3(2, 2, 5), shininess, 8.0
    ); // blue
    
    clr *= light;
    
    clr = pow(clr, vec3(0.4545));
    return clr;
    
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    float time = iTime;
    vec2 mouse = iMouse.xy;
    vec2 res = iResolution.xy;

    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    // target
    vec3 target = vec3(0, 0.0, 0);
    // ray origin
    float r = 2.5;
    vec3 ro = target + vec3(cos(time * 0.5) * r,  0.0, -sin(time * 0.5) * r);
    
    vec3 forward = normalize(target - ro); // cam w
    vec3 right = normalize(cross(forward, vec3(0, 1, 0))); // cam u
    vec3 up = normalize(cross(right, forward)); // cam v
    
    // ray direction
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.2 * forward);
    
    // calculate color based on distance, etc
    vec3 clr = calcClr(ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
