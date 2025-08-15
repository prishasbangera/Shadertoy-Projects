# define AA 2 // sqrt(number of samples per pixel) add later
const int MAX_BOUNCES = 5;

/*

Experiment (Lighting with raymarching)
Prisha B.

SOURCES

Coding Adventure: Ray Tracing
AN AMAZING VIDEO by Sebastian Lague
https://www.youtube.com/watch?v=Qz0KTGYJtUk

Using code from https://www.shadertoy.com/view/mssfW7
Link: https://www.shadertoy.com/view/dtlyDs


Scratchapixel
https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-sphere-intersection.html


PRNG
https://en.wikipedia.org/wiki/Xorshift

https://www.youtube.com/watch?v=sl9x19EnKng

*/

/////////////////////////////////////////////////////////////////////////////////////////////////

uint globalSeed;

float random1d(inout uint state) {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return float(state & 0xffffffu) / float(0xffffff);
}

// https://www.youtube.com/watch?v=Qz0KTGYJtUk
float randomNormalDist(inout uint state) {
    float theta = 2.0 * 3.14159265 * random1d(state);
    float rho = sqrt(-2.0 * log(random1d(state)));
    return rho * cos(theta);
}

float random2d(in vec2 v) {
    return fract(15465.1327854 * sin(dot(v, vec2(173.93422, 102.5165))));
}

vec3 randomUnitVec(inout uint state) {
    vec3 v;
    for (int i = 0; i < 100; i++) {
        v.x = randomNormalDist(state) * 2.0 - 1.0;
        v.y = randomNormalDist(state) * 2.0 - 1.0;
        v.z = randomNormalDist(state) * 2.0 - 1.0;
        if (dot(v, v) <= 1.0) {
            return normalize(v);
        }
    }
    return normalize(v);
}

/////////////////////////////////////////////////////////////////////////////////////////////////

struct Material {

    vec3 clr;
    vec3 emissionClr;
    float emissionStrength;

};

Material defaultMaterial() {

    Material mat;
    mat.clr = vec3(0.5);
    mat.emissionClr = vec3(0.0);
    mat.emissionStrength = 0.0;
    
    return mat;

}

/////////////////////////////////////////////////////////////////////////////////////////////////

float sdBox(in vec3 pt, in vec3 r) {
    return length(max(abs(pt) - r, 0.0));
}

float sdSphere(vec3 pt, float r) {
    return length(pt) - r;
}

/////////////////////////////////////////////////////////////////////////////////////////////////

// return vec4( signed distance, pt )
vec4 sdf(in vec3 pt, inout Material mat) {

    float time = iTime;
    mat = defaultMaterial();
    float d = 100.0;

    // center
    d = sdSphere(pt - vec3(cos(time), sin(time), 0.0) * 3.0, 0.2);
    
    // teeth 1
    {   
        vec3 q = pt;

        float sectorSize = 6.283185/32.0;
        float sectorId = round(atan(pt.z, pt.x)/sectorSize);
        float an = sectorId * sectorSize;
        
        // rotate q to x axis
        q.xz = mat2(cos(an), -sin(an), sin(an), cos(an)) * q.xz;
        
        float t = sdBox(q - vec3(1.0, 0, 0), vec3(0.04, 0.05, 0.1)) - 0.05;
        q.xy = mat2(cos(0.5), -sin(0.5), sin(0.5), cos(0.5)) * q.xy;
        t = min(t, sdBox(q - vec3(0.9, -0.4, 0), vec3(0.5, 0.01, 0.01)) - 0.01);
        
        mat.clr = vec3(0.5, 1, 1);
        
        if (int(sectorId) % 4 == 0 && length(pt) > 1.0) {
            mat.emissionStrength = 0.9;
            mat.emissionClr = normalize(vec3(sectorSize, sectorId, an));
        }
        
        d = min(d, t);
        
    }
    
    //experiment
    {
        vec3 q = pt - vec3(0.0, -0.2, 0.0);
        float ex = length(abs(vec2(pt.x, pt.x*pt.x*pt.x*2.0) - q.xy)) - 0.03;
        ex = max(ex, abs(q.x) - 0.5);
        ex = max(ex, abs(q.z) - 0.5);
        
        mat.clr = ex < d ? vec3(0.5) : mat.clr;
        d = min(ex, d);
    }
    
    // sun center thingy
    {
        float s = sdSphere(pt - vec3(0, 0.0, 0), 0.2);
        if (s < d) {
            mat.emissionStrength = 2.0;
            mat.emissionClr = vec3(0.1, 1, 1);
        }
        d = min(s, d);
    }
    
    mat.clr = mat.emissionStrength > 0.0 ? vec3(0.0) : mat.clr;

    return vec4(d, pt);

}

vec3 calcNormal(in vec3 pt) {

    vec2 h = vec2(0.001, 0.0);
    Material m; // placeholder

    return normalize(vec3(
        sdf(pt + h.xyy, m).x - sdf(pt - h.xyy, m).x,
        sdf(pt + h.yxy, m).x - sdf(pt - h.yxy, m).x,
        sdf(pt + h.yyx, m).x - sdf(pt - h.yyx, m).x
    ));

}

/////////////////////////////////////////////////////////////////////////////////////////////////

vec4 raymarch(in vec3 ro, in vec3 rd, inout Material mat) {

    vec4 res = vec4(-1);
    
    float td = 0.001;
    float tmax = 5.0;
    for (int i = 0; i < 128 && td < tmax; i++) {
        vec4 h = sdf(ro + td*rd, mat);
        if (abs(h.x) < 0.001) {
            res = vec4(td, h.yzw);
            break;
        }
        td += h.x;
    }
    
    return res;

}

/////////////////////////////////////////////////////////////////////////////////////////////////

vec3 render(in vec2 uv, in vec3 ro, in vec3 rd) {
    
    // change global seed for each pixel
    globalSeed = uint(float(0xffffff) * random2d(uv)); 
    
    vec3 skyClr = vec3(rd.y + 1.0) * vec3(0.01, 0.05, 0.2) * 0.1;
  
    vec3 rayClr = vec3(1.0);
    vec3 incomingLight = vec3(0.0);
    
    for (int i = 0; i < MAX_BOUNCES; i++) {
        
        // get closest object, if any
        Material mat;
        vec4 intersection = raymarch(ro, rd, mat);
        float dist = intersection.x;
        
        if (dist > 0.0) {
        
            // calculate normal
            vec3 nor = calcNormal(ro + rd*dist);
        
            // change ray origin to intersection point
            ro = ro + rd*dist;
            // random hemisphere direction from intersection point
            vec3 randomDir = randomUnitVec(globalSeed);
            rd = randomDir * sign(dot(nor, randomDir));
            
            // accumlate color
            // emitted light
            vec3 emittedLight = mat.emissionClr * mat.emissionStrength;
            incomingLight += emittedLight * rayClr;
            // object color
            rayClr *= mat.clr;
            
        } else {
            incomingLight += skyClr * rayClr;
            break;
        }
        
    }
    
    vec3 clr = incomingLight;
    
    //clr.r = smoothstep(0.0, 1.0, clr.r);
    //clr.g = smoothstep(0.0, 1.0, clr.g);
    //clr.b = smoothstep(0.0, 1.0, clr.b);
    
    return clr;
    
}

/////////////////////////////////////////////////////////////////////////////////////////////////


vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target, in float zoom) {
    vec3 f = normalize(target - ro);
    vec3 r = normalize(cross(f, vec3(0, 1, 0)));
    vec3 u = normalize(cross(r, f));
    return normalize(uv.x * r + uv.y * u + zoom * f);
}


void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    float time = iTime * 0.5;
    vec3 clr = vec3(0.0);
    
    #if AA > 1
    for (int i = 0; i < AA; i++)
    for (int j = 0; j < AA; j++) 
    {
        
        vec2 offset = vec2(i, j) / float(AA) - 0.5;
        vec2 uv = (2.0 * (fragCoord + offset) - iResolution.xy)/iResolution.y;
        # else 
        vec2 uv = (2.0 * (fragCoord) - iResolution.xy)/iResolution.y;
        #endif
    
        float an = 0.4, rad = 0.5;
        vec3 ro = vec3(sin(an) * rad, 1.0, cos(an) * rad);
        vec3 target = vec3(0);
        vec3 rd = setCamera(uv, ro, target, 1.2);
        
        clr += render(uv, ro, rd);
    
    #if AA > 1
    }
    clr /= float(AA*AA);
    #endif
    
    clr = pow(clr, vec3(0.4545));
    

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
    