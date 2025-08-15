/*

doublethink (raymarching experiment)

Prisha B.
2024-04-10

Link: https://www.shadertoy.com/view/mssfW7

Source for learning: https://www.youtube.com/watch?v=sl9x19EnKng

*/

const int AA = 2; // sqrt(number of samples per pixel) add later

/////////////////////////////////////////////////////////////////////////////////////////////////

float sdBox(in vec3 pt, in vec3 r) {
    return length(max(abs(pt) - r, 0.0));
}

float sdSphere(vec3 pt, float r) {
    return length(pt) - r;
}

/////////////////////////////////////////////////////////////////////////////////////////////////

// return vec4( signed distance, pt )
vec4 sdf(in vec3 pt) {

    float time = iTime;
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
        
        
        d = min(d, t);
        
    }
    
    //experiment
    {
        vec3 q = pt - vec3(0.0, -0.2, 0.0);
        float ex = length(abs(vec2(pt.x, pt.x*pt.x*pt.x*2.0) - q.xy)) - 0.03;
        ex = max(ex, abs(q.x) - 0.5);
        ex = max(ex, abs(q.z) - 0.5);
        d = min(ex, d);
    }

    return vec4(d, pt);

}

vec3 calcNormal(in vec3 pt) {

    vec2 h = vec2(0.001, 0.0);

    return normalize(vec3(
        sdf(pt + h.xyy).x - sdf(pt - h.xyy).x,
        sdf(pt + h.yxy).x - sdf(pt - h.yxy).x,
        sdf(pt + h.yyx).x - sdf(pt - h.yyx).x
    ));

}

/////////////////////////////////////////////////////////////////////////////////////////////////

vec4 raymarch(in vec3 ro, in vec3 rd) {

    vec4 res = vec4(-1);
    
    float td = 0.001;
    float tmax = 5.0;
    for (int i = 0; i < 128 && td < tmax; i++) {
        vec4 h = sdf(ro + td*rd);
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

    vec3 clr = vec3(0);
    
    vec4 intersection = raymarch(ro, rd);
    float dist = intersection.x;
    
    if (dist > 0.0) {
        clr = 0.5 + 0.5*vec3(calcNormal(ro + rd*dist));
    }
   
    
    clr.r = smoothstep(0.0, 1.0, clr.r);
    clr.g = smoothstep(0.0, 1.0, clr.g);
    clr.b = smoothstep(0.0, 1.0, clr.b);
    
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

    // Normalized pixel coordinates
    vec2 uv = (2.0 * fragCoord - iResolution.xy)/iResolution.y;
    float time = iTime * 0.5;
    
    vec3 ro = vec3(sin(time) * 1.8, 1.0, cos(time) * 1.8);
    vec3 target = vec3(0);
    vec3 rd = setCamera(uv, ro, target, 1.2);
    
    vec3 clr = render(uv, ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}