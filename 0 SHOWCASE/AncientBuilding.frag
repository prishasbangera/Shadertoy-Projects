/*

Ancient Building

Prisha B.
2021-10-05

Sources for learning: Inigo Quilez's videos and articles.
Heavily inspired by IQ's livestream on the Greek Temple.

Link: https://www.shadertoy.com/view/fd3XRS

My coding timelapse on this: https://www.youtube.com/watch?v=_2hb0vOE3PM

*/

const float EPSILON = 0.001;

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
    float id;
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

// smooth max
float smoothmax( float a, float b, float k ) {
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}

// smooth min for distance and color
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

// SDF TEMPLE

float sdfTemple(in vec3 pt) {

    float res;
    
    //if (sdfBox(pt, vec3(10.0)) > 0.0) return 1000.0;
    
    {
        // columns
        vec3 p =  pt - vec3(0.0, 1.00, 0.0);
        float b = sdfBox(p - vec3(0, 1, 0), vec3(2.9, 1.8, 1.2)); // remove center columns
        p = finRep(p, vec3(2.0, 1.0, 1.6), vec3(2, 0, 1));
        // bottom base
        res = sdfBox(p - vec3(0, 0.05, 0), vec3(0.37, 0.05, 0.37)) + p.y * 0.5;
        res = smoothmin(res, sdfBox(p - vec3(0, 0.15, 0), vec3(0.26, 0.027, 0.26)), 0.1) - 0.03;
        // top of column
        res = min(res, sdfBox(p - vec3(0, 2.1, 0), vec3(0.25, 0.05, 0.25))) - 0.01;
        res = smoothmin(res, sdfBox(p - vec3(0, 2.25, 0), vec3(0.39, 0.03, 0.39)), 0.2) - 0.01;
        // columns
        float col = sdfBox(p - vec3(0, 1.15, 0), vec3(0.24, 1.0, 0.24));
        // bring out top of column
        col = smoothmin(col, sdfBox(p - vec3(0, 1.9, 0), vec3(0.18, 0.001, 0.18))-0.15, 0.1);
        // distortion
        col += 0.015 * sin(10.0 * atan(p.z, p.x));
        col += 0.05 * p.y;
        res = smoothmin(res, col, 0.1);
        //d -= noise(vec3(pt.x * 2.0, pt.y * 0.5, pt.z * 2.0) * 20.0) * 0.01; // noise
        //d -= fractalNoise(pt) * 0.1;
        res = max(-b, res); // remove center columns
    
        // steps / floor
        vec3 s = p - vec3(0, -0.2, 0);
        float steps = sdfBox(s, vec3(0.95, 0.1, 0.75)) - 0.03;
        s = finRep(pt - vec3(0, 0.5, 0.0), vec3(1.6, 0.2, 1.3), vec3(3, 0.0, 2.0));
        steps = min(steps, sdfBox(s, vec3(0.74, 0.15, 0.60)) - 0.03);// - fractalNoise(pt) * 0.05;
        res = smoothmin(res, steps, 0.05);
    }
    
    // roof
    {
        vec3 q = pt - vec3(0, 3.4, 0);
        vec3 r = finRep(q, vec3(1.05, 0.2, 0.65), vec3(4, 0, 3));
        // ceiling
        float c = sdfBox(r, vec3(0.4, 0.08, 0.28)) - 0.02;
        // trngle prism
        q.y -= 0.4;
        q.x = abs(q.x) - 4.25;
        vec3 triPrism = vec3(0.25, 0.25, 0.9 - q.y * 3.5);
        float roof = sdfBox(q, triPrism) - 0.06;
        triPrism.y *= 0.7;
        triPrism.z = - q.y * 4.7;
        roof = smoothmax(roof, -sdfBox(q - vec3(0.4, -0.2, 0), triPrism) - 0.02, 0.2);
        roof = min(c, roof);
        res = min(roof, res);
    }
    
    return res;

}

// SDF SCENE

float sdfScene(in vec3 pt, out Material mat) {

    // distance to closest object
    float res;
    
    Material templeMat;
    float temple = sdfTemple(pt - vec3(2, -0.45, 3.0));
    {
        float n = fractalNoise(pt*1.7);
        temple -= n * 0.03;
        templeMat.clr = vec3(0.1, 0.06, 0.02) + 1.5 * n * vec3(0.05, 0.01, 0.02);
        templeMat.dif = 1.0;
        templeMat.spec = 0.9;
        templeMat.shininess = 20.0;
        templeMat.amb = 0.05;
        templeMat.id = 1.0;
    }
    
    // ground
    float ground;
    Material groundMat;
    {
        float n = fractalNoise(pt * 0.3);
        ground = pt.y - 0.12 * sin(pt.x * 0.9) * sin(pt.z * 0.8);
        
        // hills
        float hill = sdfEllipsoid(pt - vec3(-5, 0, -22), vec3(8.0, 6.0, 5.0));
        hill = smoothmin(hill, sdfEllipsoid(pt - vec3(-11, 0, -19), vec3(5, 3.0, 5)), 2.2);
        hill = smoothmin(hill, sdfEllipsoid(pt - vec3(-3, 0, -15), vec3(5, 3.0, 5)), 3.2);
        hill = smoothmin(hill, sdfEllipsoid(pt - vec3(2, 0, -18), vec3(8, 5.0, 3)), 2.2);
        hill = smoothmin(hill, sdfEllipsoid(pt - vec3(7, 0, -15), vec3(7, 4.0, 5)), 2.2);
        hill = smoothmin(hill, sdfEllipsoid(pt - vec3(15, 0, -11), vec3(10, 3, 10)), 3.0);
        hill = smoothmin(hill, sdfEllipsoid(pt - vec3(18, 0, -1), vec3(5, 3, 3)), 3.0);
        hill = smoothmin(hill, sdfEllipsoid(pt - vec3(27, 0, 3), vec3(5, 3, 5)), 3.0);
        hill -= 0.6 * sin(pt.x * 1.1) * sin(pt.z * 0.2) + n*0.8;
        ground = smoothmin(ground - 0.15*n, hill, 2.8);
        
        // ground clr
        groundMat.clr = vec3(0.075, 0.075, 0.09);
        groundMat.dif = 1.0;
        groundMat.spec = 0.7;
        groundMat.shininess = 50.0;
        groundMat.amb = 0.01;
        groundMat.id = 0.0;
    }
    
    // material and res
    
    if (ground < temple) {
        res = ground;
        mat = groundMat;
    } else {
        res = temple;
        mat = templeMat;
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

float castRay(in vec3 ro, in vec3 rd, out Material mat) {
    
    // result
    float res = -1.0;
    // total distance traveled
    float td = 0.00;
    
    for (int i = 0; i < 256 && td < 60.0; i++) {
        Material m;
        float h = sdfScene(ro + td*rd, m);
        // if distance is really close, break
        if (abs(h) < (0.001*td)) {
           res = td;
           mat = m;
           break;
        }
        // add to total distance
        td += h;
    }
       
    return res;
    
}

float softShadow(in vec3 ro, in vec3 rd, in float k) {
    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    for (int i = 0; i < 256 && td < 60.0; i++) {
        Material m;
        float d = sdfScene(ro + td*rd, m);
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

float calcOcc(in vec3 pt, in vec3 nor) {

    float occ = 0.0;
    float scl = 1.0;
    
    Material m; // placeholder
    
    for (int i = 0; i < 4; i++) {
        float h = 0.01 + 0.07 * float(i);
        float d = sdfScene(pt + h * nor, m);
        occ += (h-d)*scl;
        scl *= 0.97;
    }
    
    return uclamp(1.0 - 2.0 * occ);
    
}

//*******************************************************//

vec3 applyFog(in vec3 rd, in float d, in vec3 clr, in vec3 sunClr, in vec3 sunDir, in vec3 skyClr) {
    vec3 fogClr = mix( skyClr, sunClr, pow(max(dot(rd, sunDir), 0.0), 8.0) );
    return mix(clr, fogClr, 1.0 - exp(-0.0001 * d * d * d)); // fog
}

vec3 calcLighting(in vec3 pt, in vec3 rd, in vec3 nor, in Light light, in Material mat) {
    
    // diffuse
    float dif = uclamp(dot(nor, light.dir)) * mat.dif;
    
    // shadow
    float shadow = softShadow(pt + nor*0.001, light.dir, light.shadowSoftness);
    
    // specular
    vec3 ref = reflect(light.dir, nor);
    float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

    // return dif * clr * shadow * spec + dif * clr * shadow; 
    return light.clr * shadow * dif * (spec + 1.0);
    
}

vec3 calcClr(in vec3 ro, in vec3 rd, in float d, in Material mat) {

    vec3 pt = ro + rd * d;
    
    // KEY LIGHT
    Light sun;
    sun.clr = vec3(12.9, 6.0, 4.7),
    sun.dir = normalize(vec3(0.85, 0.2, 0.8));
    sun.shadowSoftness = 30.9;
    
    // COLORS
    vec3 skyClr = vec3(0.8, 0.5, 0.8) - 0.9 * rd.y;
    // overexposure effect
    vec3 shine = 0.35 * sun.clr * pow(uclamp(dot(sun.dir,rd)), 5.0);
    
    // background color
    vec3 clr = skyClr;
    
    // return background if too far
    if (d < 0.0) {
        // sun
        return clr + shine;
    }
    
    vec3 nor = calcNormal(pt);
    
    // MATERIAL COLOR
    
    clr = mat.clr;
    
    // hills
    if (mat.id == 0.0) {
        clr += vec3(0.1 * max(pt.y, 0.0))  * 0.7 * uclamp(dot(nor, vec3(0, 1, 0)));
    }
    
    // LIGHTS AND COLOR
    
    float occ = calcOcc(pt, nor);
    
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat); // sun
    light += (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr * occ; // sky diffuse

    clr *= light;
    
    clr = applyFog(rd, d, clr, sun.clr * 0.2, sun.dir, skyClr);
    
    clr += shine;
    
    return clr;

}

//*******************************************************//

vec3 render(in vec3 ro, in vec3 rd) {

    // cast ray, return dist to closest object and material
    Material mat;
    float d = castRay(ro, rd, mat);
    
    vec3 clr = calcClr(ro, rd, d, mat);
    
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

    // Normalized pixel coordinates
    vec2 res = iResolution.xy;
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    // target
    vec3 target = vec3(0.7, -0.2, -2.2);
    // ray origin
    vec3 ro = target + vec3(-6.7,  2.5, 7.7);
    
    vec3 rd = setCamera(uv, ro, target);
    
    // calculate color based on distance, etc
    vec3 clr = render(ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
