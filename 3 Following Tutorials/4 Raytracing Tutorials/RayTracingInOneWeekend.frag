/*

Ray Tracing Attempt in Shadertoy

Prisha B.

Following Ray Tracing in One Weekend: https://raytracing.github.io/books/RayTracingInOneWeekend.html

Link: https://www.shadertoy.com/view/7ttXz7

Sources for learning:

For Anti-Aliasing:
https://www.shadertoy.com/view/3lsSzf

PRNG
https://en.wikipedia.org/wiki/Xorshift
https://www.shadertoy.com/view/wljXDz

*/

const float MAX_DIST = 10000.0;
const float MIN_DIST = 0.001;
const int SSAA = 6; // sqrt(samples) per pixel

struct Object {

    vec3 pos; // position
    vec3 nor; // surface normal
    float t; // distance from ray origin to object
    bool outside; // whether the normal is point inside or outside
    
    vec3 clr;
    
    // 0 : plane
    // 1 : sphere
    int shapeType;
    
    vec3 dif;
    // vec3 ref;
    
};

/********************************************************************/

uint globalSeed;

float random1() {
    globalSeed ^= globalSeed << 13;
    globalSeed ^= globalSeed >> 17;
    globalSeed ^= globalSeed << 5;
    return float(globalSeed & 0xffffffu) / float(0xffffff);
}

float random3(in vec3 v) {
    return fract(15465.1327854 * sin(dot(v, vec3(173.93422, 102.5165, 23.1234))));
}

vec3 randomUnitVec() {
    vec3 v;
    v.x = random1() * 2.0 - 1.0;
    v.y = random1() * 2.0 - 1.0;
    v.z = random1() * 2.0 - 1.0;
    return normalize(v);
}

/********************************************************************/

Object calcSphere(in vec3 ro, in vec3 rd, in vec3 center, in float radius) {

    Object sphere;
    sphere.pos = center;
    sphere.shapeType = 1;
    
    // origin to center
    vec3 oc = ro - center;
    
    // quadratic equation to solve for t
    // 0 = dot(rd, rd) * t^2 + 2*dot(dir, oc)*t + mag(oc)^2-rad^2
    
    /*
    
        a = dot(rd, rd) -> rd normalized so it equals 1
        b = 2*dot(rd,oc) (call it 2 * h)
    
        t = ( -2h +or- sqrt((2h)^2 - 4c) ) / 2
        t = ( -2h +or- 2 * sqrt(h*h - c) ) / 2
        t = -h +or- sqrt(h*h - c) -> simplified
    
    */
    
    float halfb = dot(rd, oc); // b is 2.0 * dot(rd, oc)
    float c = dot(oc, oc) - radius*radius;
    
    float discriminant = halfb*halfb - c;
    
    // if there is more than one solution (ray goes through two points on sphere)
    if (discriminant > 0.0) {
    
        // distance to sphere
        float d = MAX_DIST;
        
        // square of discriminant
        float sd = sqrt(discriminant);
        
        // both solutions
        float t1 = -halfb + sd;
        float t2 = -halfb - sd;
        
        // if t is positive (obj in view), calc min
        if (t1 > MIN_DIST) d = min(d, t1);
        if (t2 > MIN_DIST) d = min(d, t2);
        
        sphere.t = d;
    
    }
    
    return sphere;
    
}

/********************************************************************/

void objUnion(inout Object mainObj, in Object obj2) {
    
    // if new object is valid, in view, and closer, replace main object
    if (obj2.shapeType != -1 && obj2.t < mainObj.t && obj2.t > MIN_DIST) mainObj = obj2;
    
}

/********************************************************************/

void calcNormal(in vec3 ro, in vec3 rd, inout Object obj) {

    if (obj.shapeType == 1) {
        obj.nor = normalize(ro+rd*obj.t - obj.pos); 
    } else if (obj.shapeType == 1) return;
    
    // inside or outside
    obj.outside = dot(rd, obj.nor) < 0.0;
    
    // flip normal if inside
    obj.nor *= obj.outside ? 1.0 : -1.0;

}

/********************************************************************/

// return closest object
Object map(in vec3 ro, in vec3 rd) {

    Object obj;
    obj.t = MAX_DIST;
    obj.shapeType = -1;
    
    // objects
    objUnion( obj, calcSphere(ro, rd, vec3(0.001, 0.001, 0.0),  0.4) );
    objUnion( obj, calcSphere(ro, rd, vec3(  0.5,   0.0, 0.5),  0.1) );
    objUnion( obj, calcSphere(ro, rd, vec3(  0.0, -75.2, 0.0), 74.8) );
    
    obj.clr = vec3(random3(obj.pos), random3(obj.pos * 10.0), random3(obj.pos * 0.5));
    obj.dif = vec3(0.5);
    // obj.ref = vec3(0.4, 0.6, 0.2);
    
    
    return obj;

}

/********************************************************************/

vec3 render(in vec2 uv, in vec3 ro, in vec3 rd) {
    
    // sky color
    vec3 skyClr = mix(vec3(1.0), vec3(0.4, 0.6, 0.8), smoothstep(0.2, 0.7, rd.y));
    vec3 clr = skyClr;
    
    // get closest object, if any
    Object obj = map(ro, rd);
    
    // change global seed for each pt
    globalSeed = uint(float(0xffffff) * random3(ro + rd*obj.t));
    
    if (obj.shapeType != -1) {
    
        calcNormal(ro, rd, obj);
        clr = obj.clr;
        vec3 dif = obj.dif;
        
        // attenuation
        vec3 atten = vec3(1.0);
        
        for (int i = 0; i < 5; i++) {
        
            ro = ro + rd*obj.t + obj.nor * 0.001;
            
            rd = normalize(obj.nor + randomUnitVec()/* * (obj.outside ? 1.0 : -1.0)*/);
        
            obj = map(ro, rd);

            if (obj.shapeType != -1) {
                atten *= dif;
                calcNormal(ro, rd, obj);
            } else break;
        
        }
        
        clr *= atten;
        
    }

    clr = pow(clr, vec3(0.4545));
    clr = clamp(clr, vec3(0.0), vec3(1.0));
    
    return clr;
    
}

/********************************************************************/

vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));
    // ray direction
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.2 * forward);
    return rd;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    
    vec2 res = iResolution.xy;
    float time = iTime * 0.5;
    
    // target
    vec3 target = vec3(0, 0, 0);
    // ray origin
    vec3 ro = vec3(cos(time)*1.2, 0.2 + sin(time) * 0.1, sin(time)*1.2);
    
    vec3 clr = vec3(0);
    
    for (int i = 0; i < SSAA; i++) {
        for (int j = 0; j < SSAA; j++) {

            // pixel coordinates
            vec2 f = vec2(float(i), float(j)) / float(SSAA) - 0.5;
            vec2 uv = (2.0 * (fragCoord+f) - res) / min(res.x, res.y);

            // ray direction
            vec3 rd = setCamera(uv, ro, target);

            // calculate color based on distance, etc and accumulate
            clr += render(uv, ro, rd);
    
        }
    }
    
    // average the color
    clr /= float(SSAA * SSAA);
    
    fragColor = vec4(clr, 1.0);

}