/*

following tutorial by inigo quilez
https://www.youtube.com/watch?v=sl9x19EnKng

Link: https://www.shadertoy.com/view/cd2fWW

unfinished

*/

#define AA 1 // sqrt(number of samples per pixel) add later

/////////////////////////////////////////////////////////////////////////////////////////////////

float smoothmax(in float a, in float b, in float k) {
    float delta = max(k - abs(a - b), 0.0);
    return max(a, b) + (0.25/k)*delta*delta;
}

vec2 rot45(in vec2 v) {
    // sqrt(2)/2 = 0.707106781187
    return 0.707106781187 * vec2(v.x - v.y, v.x + v.y);
}

/////////////////////////////////////////////////////////////////////////////////////////////////

// 3d box
float sdBox(in vec3 pt, in vec3 r) {
    return length(max(abs(pt) - r, 0.0));
}

// 2d box
float sdBox(in vec2 pt, in vec2 r) {
    return length(max(abs(pt) - r, 0.0));
}

// sphere
float sdSphere(in vec3 pt, in float r) {
    return length(pt) - r;
}

// cross
float sdCross(in vec3 pt, in vec3 r) {
    pt = abs(pt);
    pt.xz = (pt.z > pt.x) ? pt.zx : pt.xz;
    return sdBox(pt, r);
}

// stick
float sdStick(in vec3 pt, in float h, in float r) {
    pt.y = abs(pt.y);
    float d = max(pt.y - h, 0.0);
    return sqrt(pt.x*pt.x + pt.z*pt.z + d*d) - r;
}

/////////////////////////////////////////////////////////////////////////////////////////////////

vec4 sdGear(in vec3 pt, in float time, in float offset) {
    
    // rotate pt    
    float sectorSize = 6.283185/12.0;
    float ang = sign(pt.y) * time + offset * sectorSize * 0.5;
    pt.y = abs(pt.y);
    pt.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * pt.xz;

    float d = 128.0;

    float sectorId = round(atan(pt.z, pt.x)/sectorSize);
    float an = sectorId * sectorSize;

    // rotate q to x axis
    vec3 q = pt;
    q.xz = mat2(cos(an), -sin(an), sin(an), cos(an)) * q.xz;

    // gear teeth
    float t = sdBox(q.xz - vec2(0.39, 0), vec2(0.1, 0.044)) - 0.02;

    // find distance to ring
    float h = 1.2;
    float ring = abs(length(pt.xz) - 0.37) - 0.05;
    t = min(t, ring);

    // cross
    float c = sdCross(pt - vec3(0.0, h, 0.0), vec3(0.35, 0.005, 0.005)) - 0.01;
    t = min(t, c);

    // clip top and bottom
    float rad = length(pt);
    t = smoothmax(t, abs(rad-h)-0.04, 0.005);
    
    d = min(d, t);

    // stick
    t = sdStick(pt, h + 0.02, 0.02);
    d = min(d, t);
    
    return vec4(d, pt);

}

// return vec4( signed distance, pt )
vec4 sdf(in vec3 pt) {

    float time = iTime * 2.0;
    vec4 res = vec4(128., pt);
    
    vec3 q = pt;
         if (abs(q.x) > abs(q.y) && abs(q.x) > abs(q.z)) q = q.yxz * vec3(-1, 1, 1);
    else if (abs(q.z) > abs(q.y))                        q = q.xzy * vec3(-1, 1, 1);
    
    vec4 g1 = sdGear(q, time, 0.0); res = g1.x < res.x ? g1 : res;
    
    // rotate X 90 degrees
    {
    vec3 qx = vec3(rot45(pt.zy), pt.x);
         if (abs(qx.x) > abs(qx.y)) qx = qx.zxy;
    vec4 g2 = sdGear(qx, time, 1.0);
    res = res.x > g2.x ? g2 : res;
    }
    
    // rotate Y 90 degrees
    {
    vec3 qy = vec3(rot45(pt.xz), pt.y);
         if (abs(qy.x) > abs(qy.y)) qy = qy.zxy;
    vec4 g2 = sdGear(qy, time, 1.0);
    res = res.x > g2.x ? g2 : res;
    }
    
    // rotate Z 90 degrees
    {
    vec3 qz = vec3(rot45(pt.yx), pt.z);
         if (abs(qz.x) > abs(qz.y)) qz = qz.zxy;
    vec4 g2 = sdGear(qz, time, 1.0);
    res = res.x > g2.x ? g2 : res;
    }
    
    // center
    float s = sdSphere(pt, 0.35);
    res = s < res.x ? vec4(s, pt) : res;
    
    return res;

}

//https://www.shadertoy.com/view/cdsfWN#

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

// https://www.shadertoy.com/view/3lsSzf
// ambient occlusion
float calcAO(in vec3 pt, in vec3 nor) {

    float occ = 0.0;
    float scl = 1.0;
    
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.12 * 0.25 * float(i);
        float d = sdf(pt + h * nor).x;
        occ += (h-d)*scl;
        scl *= 0.95;
    }
    
    return clamp(1.0 - 2.0 * occ, 0.0, 1.0);
    
}

/////////////////////////////////////////////////////////////////////////////////////////////////

vec3 render(in vec2 uv, in vec3 ro, in vec3 rd) {

    vec3 clr = 0.01*vec3(1.0 + rd.y);
    
    vec4 intersection = raymarch(ro, rd);
    float dist = intersection.x;
    
    // calculate color from intersection
    if (dist > 0.0) {
    
        vec3 pt = dist*rd + ro;
        vec3 nor = calcNormal(pt);
        
        vec3 mat = 0.5 * texture(iChannel0, intersection.yw).rgb + 
                   0.5 * texture(iChannel0, intersection.yz * 2.0).rgb;
        //mat = 0.8 * mat + 0.2;
        //if (length(pt) < 0.36) mat = vec3(0.3, 0.2, 0.1) * 1.8;
        mat = mat*0.22; 
        
        vec3 f0 = mat;
        float fresnel = clamp(1.0 + dot(rd, nor), 0.0, 1.0);
        
        // fake occlusion
        float focc = clamp( 0.55 + 0.45*dot( nor, normalize(pt) ), 0.0, 1.0 );
        focc *= 0.1 + 0.9 * clamp( length(pt)/0.55, 0.0, 1.0);
        
        float occ = calcAO(pt + 0.001*nor, nor) * focc;
        
        vec3 light = vec3(0.0);
        
        // top light
        {
            float dif = 0.5 + 0.5*nor.y;
            dif *= occ;
            vec3 ref = reflect(rd, nor);
            
            vec3 spec = vec3( smoothstep( 0.5, 0.65, ref.y ) );
            spec *= f0 + (1.0-f0)*pow(fresnel, 5.0) * 6.0;
            
            light += vec3(0.7, 0.8, 1.1) * 0.03 * dif * occ;
            light += vec3(0.7, 0.8, 1.1) * spec * dif;
        }
        
        clr = light;
        
    }
   
    
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
    
        float rad = 2.2;
        float an = 0.9 + time * 0.8;
        vec3 ro = vec3(sin(an) * rad, 0.6, cos(an) * rad);
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