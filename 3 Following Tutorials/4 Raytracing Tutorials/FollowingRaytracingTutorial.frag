# define AA 1 //sqrt of number of rays per pixel

/*

Following ray tracing tutorial

Prisha B.
2023-07-26

Link: https://www.shadertoy.com/view/DtscR8

SOURCES

Coding Adventure: Ray Tracing
AN AMAZING VIDEO by Sebastian Lague
https://www.youtube.com/watch?v=Qz0KTGYJtUk


Scratchapixel
https://www.scratchapixel.com/lessons/3d-basic-rendering/minimal-ray-tracer-rendering-simple-shapes/ray-sphere-intersection.html


PRNG
https://en.wikipedia.org/wiki/Xorshift

*/

const float MIN_DIST = 0.01;
const float MAX_DIST = 100.0;
const int MAX_BOUNCES = 4;

/////////////////////////////////////////////////////////////////////////////////////////////////

struct Object {

    vec3 center;
    vec3 intersection; // point of intersection
    vec3 nor;
    float t; // distance from ray origin to object
    
    // 1: sphere
    int type;
    
    // object material
    vec3 clr;
    vec3 emissionClr;
    float emissionStrength;

};

Object defaultObject() {

    Object obj;
    obj.t = MAX_DIST;
    obj.type = -1;
    obj.clr = vec3(1.0);
    obj.emissionStrength = 0.01;
    obj.emissionClr = vec3(1.0);
    
    return obj;

}

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

float random3d(in vec3 v) {
    return fract(15465.1327854 * sin(dot(v, vec3(173.93422, 102.5165, 23.1234))));
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

vec3 calcNormal(in Object obj) {
    if (obj.type == 1) {
        return normalize(obj.intersection - obj.center);
    } else return vec3(0.0);
}

/////////////////////////////////////////////////////////////////////////////////////////////////

void objUnion(inout Object obj1, in Object obj2) {
    
    // if new object is valid, in view, and closer, replace main object
    if (obj2.type != -1 && obj2.t < obj1.t && obj2.t > MIN_DIST) obj1 = obj2;
    
}

/////////////////////////////////////////////////////////////////////////////////////////////////

Object calcSphere(in vec3 ro, in vec3 rd, in vec3 center, in float radius) {

    Object sphere = defaultObject();
    sphere.center = center;
    
    // origin to center
    vec3 oc = ro - center;
    if (dot(-oc, rd) < 0.0) {
        return sphere;
    }
    
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
    
        sphere.type = 1;
    
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

/////////////////////////////////////////////////////////////////////////////////////////////////

Object map(in vec3 ro, in vec3 rd) {
    
    // default object
    Object obj = defaultObject();
    
    
    // center sphere
    {
        Object s1 = calcSphere(ro, rd, vec3(0.001, -0.3, 0.0), 0.4);
        s1.clr = vec3(1, 0.9, 0.8) * 0.4;
        s1.emissionStrength = 2.0;
        s1.emissionClr = vec3(1, 0.9, 0.9);
        objUnion( obj, s1 );
    }
    
    // tiny sphere // red
    {
        Object s2 = calcSphere(ro, rd, vec3(0.4, -0.3, 0.3), 0.05);
        s2.clr = vec3(0.9, 0.2, 0.3) * 1.0;
        objUnion( obj, s2 );
    }
    
    // floor sphere
    {
        Object s3 = calcSphere(ro, rd, vec3(0.0, -75.2, 0.0), 74.8);
        s3.clr = vec3(0.2, 0.7, 0.6) * 1.2;
        objUnion( obj, s3 );
    }
    
    // more sphere blue
    {
        Object d = calcSphere(ro, rd, vec3(0.3, -0.2, -0.5), 0.2);
        d.clr = vec3(0.2, 0.2, 0.9) * 1.0;
        d.emissionStrength = 0.2;
        d.emissionClr = d.clr - vec3(-0.2, 0.2, 0);
        objUnion( obj, d );
    }
    
    // more sphere green
    {
        Object d = calcSphere(ro, rd, vec3(0.0, 0.5, 0.3), 0.1);
        d.clr = vec3(0.1, 1, 0.1) * 1.5;
        objUnion( obj, d );
    }
    
    // more sphere cyan
    {
        Object d = calcSphere(ro, rd, vec3(0.0, 0.5, 0.05), 0.15);
        d.clr = vec3(0.1, 1, 1) * 2.0;
        objUnion( obj, d );
    }
    
    // more sphere 2 yellow
    {
        Object d = calcSphere(ro, rd, vec3(0.2, -0.3, 0.5), 0.1);
        d.clr = vec3(1, 1, 0.1) * 1.0;
        d.emissionStrength = 0.2;
        d.emissionClr = d.clr;
        objUnion( obj, d );
    }
    
    // sunny spherey
    {
        Object d = calcSphere(ro, rd, vec3(-1.3, 1.0, -10.0), 3.0);
        d.clr = vec3(0.2, 0.2, 0.9) * 1.0;
        d.emissionStrength = 5.0;
        d.emissionClr = vec3(1.0, 0.4, 0.2);
        objUnion( obj, d );
    }
    
    // sunny spherey 2
    {
        Object d = calcSphere(ro, rd, vec3(-0.5, 1.0, 2.0), 1.0);
        d.clr = vec3(0.2, 0.2, 0.9) * 0.0;
        d.emissionStrength = 1.0;
        d.emissionClr = vec3(1.0, 0.2, 1.0);
        objUnion( obj, d );
    }
    
    obj.intersection = ro + rd*obj.t;
    obj.nor = calcNormal(obj);
    
    return obj;
    
}

/////////////////////////////////////////////////////////////////////////////////////////////////

vec3 render(in vec2 uv, in vec3 ro, in vec3 rd) {

    vec3 skyClr = vec3(rd.y + 1.0) * vec3(0.3, 0.4, 1.0) * 1.1;
    
    vec3 rayClr = vec3(1.0);
    vec3 incomingLight = vec3(0.0);
    
    // change global seed for each pixel
    globalSeed = uint(float(0xffffff) * random2d(uv));

    
    for (int i = 0; i < MAX_BOUNCES; i++ ) {
    
        // get closest object, if any
        Object obj = map(ro, rd);
        
        if (obj.type > -1) {
            // change ray origin to intersection point
            ro = obj.intersection;
            // random hemisphere direction
            vec3 randomDir = randomUnitVec(globalSeed);
            rd = randomDir * sign(dot(obj.nor, randomDir));
            
            vec3 emittedLight = obj.emissionClr * obj.emissionStrength;
            incomingLight += emittedLight * rayClr;
            rayClr *= obj.clr;
            
            
        } else {
            // incomingLight *= skyClr;
            break;
        }
    
    }

    return incomingLight;

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
    
        float rad = 1.1;
        float an = 1.2 + time * 0.8 * 0.0;
        vec3 ro = vec3(sin(an) * rad, 0.3, cos(an) * rad);
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