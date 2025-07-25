/*

Birb (bird)

Prisha B.
Date unknown

*/

const float EPSILON = 0.001;
const float MAX_DIST = 50.0;
const int MAX_STEPS = 150;
// const int AA = 2;

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
    vec3 ref;
    float id;
    // vec3 groundBounceClr;
};

Material defaultMaterial() {
    Material mat;
    mat.amb = 0.1;
    mat.clr = vec3(0.05);
    mat.dif = 1.0;
    mat.spec = 1.0;
    mat.shininess = 10.0;
    mat.ref = vec3(0.0);
    mat.id = -1.0;
    // mat.groundBounceClr = vec3(0.0);
    return mat;
}

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

// smoothmax
float smoothmax( float a, float b, float k ) {
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}

// Smooth min for distance and color
vec4 smoothmin(in float a, in float b, in vec3 clr1, in vec3 clr2, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    float d = mix(b, a, h) - k*h*(1.0-h);
    vec3 c = mix(clr2, clr1, h);
    return vec4(c, d);
}


//*******************************************************//

// SDFs

float sdSphere(in vec3 pt, in float rad) {
    return length(pt) - rad;
}

float sdEllipsoid(in vec3 pt, in vec3 rad) {
    float k0 = length(pt/rad);
    float k1 = length(pt/(rad*rad));
    return k0 * (k0-1.0)/k1;
}

float sdCapsule(in vec3 pt, in vec3 a, in vec3 b, in float r) {
    vec3 apt = pt - a;
    vec3 ab = b - a;
    float t = clamp(dot(apt, ab) / dot(ab, ab), 0.0, 1.0);
    return length(apt - ab * t) - r;
}

float sdBox(vec3 pt, vec3 b) {
	vec3 q = abs(pt) - b;
	return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

//*******************************************************//

// SDF BIRD

float sdBird(in vec3 pt, out Material mat) {

    // distance to closest object
    float res;
   
    // eyes and body
    float eye;
    float body;
    {
        // eyes
        vec3 e = pt - vec3(0, 0.45, 1.2);
        e.x = abs(e.x) - 0.45;
        eye = length(e) - 0.2;
        // body
        body = sdEllipsoid(pt, vec3(1.55, 1.45, 1.4));
        body = smoothmax(body, -(eye-0.01), 0.1); // eye cut out
        // wings
        vec3 w = pt - vec3(0.0, -0.2, 0.2);
        w.x = abs(w.x) - 1.5;
        float a = 0.8509035; // sqrt(2.0) * 0.5; // abs value of sin and cos of pi/4
        w.xy *= mat2(a, -a, a, a); // mat(cos, sin, -sin, cos)
        float wings = sdEllipsoid(w, vec3(0.7, 0.25, 0.35));
        body = smoothmin(body, wings, 0.25);
        
    }
    
    // beak
    float beak;
    {
        vec3 b = pt - vec3(0, 0.3, 1.4);
        float a = 0.8509035 * 1.1; // sqrt(2)
        b.yz *= mat2(a, a, a, -a);
        beak = sdEllipsoid(b, vec3(0.1, 0.1, 0.4));
    }
    
    // feet
    float feet;
    {
        vec3 f = pt - vec3(0.0, -2.2, 0.0);
        f.x = abs(f.x) - 0.3;
        vec3 end = vec3(0, -0.05, 0);
        feet = sdCapsule(f, vec3(0, 1, 0), end, 0.09);
        feet = min(feet, sdCapsule(f, end, vec3(0.2, end.y, 0.2), 0.1)); 
    }
    
    // material and res
    
    res = min(body, feet);
    res = min(res, eye);
    res = min(res, beak);
    
    if (res == body) {
        mat.clr = vec3(0.04, 0.08, 0.15);
        mat.spec = 0.5;
        mat.shininess = 10.0;
        mat.id = 1.0;
    } else if (res == eye) {
        mat.clr = vec3(0.005);
        mat.spec = 1.0;
        mat.shininess = 5.0;
        mat.id = 2.0;
    } else if (res == beak || res == feet) {
        mat.clr = vec3(0.1, 0.08, 0.01);
        mat.spec = res == beak ? 3.0 : 0.3;
        mat.shininess = 50.0;
        mat.id = 3.0;
    }
    
    return res;
    
}

// SDF TABLE 
float sdTable(in vec3 pt, out Material mat) {

    // closest distance
    float res;
    
    // default
    mat = defaultMaterial();
    
    // main
    float top;
    vec3 topClr = 0.2 * texture(iChannel0, 0.03*pt.xz).rgb;
    {
        vec3 t = pt;
        top = pt.y + 1.0;
        top += 30.0 * topClr.r * topClr.g * topClr.b;
    }
    
    float wall;
    {
        vec3 w = pt;
        w.x = abs(w.x) - 20.0;
        wall = -w.x;
    
    }
    
    // material and res
    
    res = top;
    res = min(res, wall);
    
    if (res == top) {
        mat.id = 4.0;
        mat.clr = topClr;
        mat.spec = 1.0;
        mat.shininess = 10.0;
    } else if (res == wall) {
        mat.id = 5.0;
        mat.clr = vec3(0.1);
        mat.spec = 1.0;
        mat.shininess = 10.0;
    }
    
    
    return res;

}


// SDF SCENE

float sdf(in vec3 pt, out Material mat) {

    // distance to closest object
    float res;

    Material birdMat = defaultMaterial();
    float bird = sdBird(pt - vec3(0, 1.4, 0), birdMat);
    
    Material tableMat = defaultMaterial();
    float table = sdTable(pt, tableMat);
    
    // material and res

    if (bird < table) {
        res = bird;
        mat = birdMat;
    } else {
        res = table;
        mat = tableMat;
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
    
    for (int i = 0; i < MAX_STEPS; i++) {
        Material m;
        float h = sdf(ro + td*rd, m);
        // if distance is really close, break
        if (abs(h) < (0.0001*td)) { mat = m; break; }
        // add to total distance
        td += h;
        // if too far, break
        if (td >= MAX_DIST) {
            mat.id = -1.0;
            mat.ref = vec3(0.0);
            break;
        }
    }
    
    return td;
    
}

float softShadow(in vec3 ro, in vec3 rd, in float k) {
    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    for (int i = 0; i < MAX_STEPS && td < MAX_DIST; i++) {
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
    float shadow = softShadow(pt, light.dir, light.shadowSoftness);
    
    // specular
    vec3 ref = reflect(light.dir, nor);
    float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

    // return dif * clr * shadow * spec + dif * clr * shadow; 
    return light.clr * shadow * dif * (spec + 1.0);
    
}

vec3 calcClr(in vec3 ro, in vec3 rd, in float d, in vec3 nor, in Material mat) {

    vec3 pt = ro + rd * d;

    // COLORS
    vec3 skyClr = vec3(0.5, 0.6, 0.7);
    
    // KEY LIGHT
    Light sun;
    sun.clr = vec3(9.8, 8.0, 5.7) * 0.5;
    sun.dir = normalize(vec3(0.0, 0.1, 0.5));
    sun.shadowSoftness = 20.9;
    
    // background color
    vec3 clr = skyClr;

    // return background if too far (id is -1.0)
    if (mat.id == -1.0) {
        // sun
        clr = mix(skyClr, sun.clr * 0.15, pow(max(dot(rd, sun.dir), 0.0), 50.0));
        return clr;
    }
    
    clr = mat.clr;
    
    // LIGHTS
   
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor);
    vec3 light = vec3(mat.amb);
    light += calcLighting(pt, rd, nor, sun, mat) * occ; // sun
    light += (uclamp(dot(nor, vec3(0, 1, 0))) * 0.5 + 0.5) * skyClr * occ; // sky diffuse

    clr *= light;
    
    clr = applyFog(rd, d, clr, sun.clr * 0.1, sun.dir, skyClr);
    
    return clr;

}

//*******************************************************//

vec3 render(in vec3 ro, in vec3 rd) {
    
    Material mat;
    vec3 clr = vec3(0);

    float d = castRay(ro, rd, mat);
    vec3 nor = calcNormal(ro + rd*d);
    
    clr = calcClr(ro, rd, d, nor, mat);
    
    /*
    if (mat.ref.r > 0.0 || mat.ref.g > 0.0 || mat.ref.b > 0.0) {
        vec3 fil = vec3(1.0);
        vec3 ref = mat.ref;
        for (int i = 0; i < 5; i++) {
            fil *= ref;
            // to intersection point and reflect
            ro += rd*d + nor*EPSILON*3.0;
            rd = reflect(rd, nor);
            // find new point
            d = castRay(ro, rd, mat);
            nor = calcNormal(ro + rd*d);
            clr += fil * calcClr(ro, rd, d, nor, mat);
            if (mat.id == -1.0) break;
        }
    }
    */
    
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

    // float time = iTime;
    vec2 mouse = iMouse.xy;
    vec2 res = iResolution.xy;
    
    // target
    vec3 target = vec3(0, 2, 0);
    // ray origin
    float movX = -10.0 * mouse.x/res.x + 5.0;
    float r = 5.5;
    vec3 ro = target + vec3(sin(movX) * r,  -10.0 * mouse.y/res.y + 10.0, cos(movX) * r);

    /*
    // accumulate color
    vec3 clr = vec3(0.0);
    
    for (int i = 0; i < AA; i++) {
        for (int j = 0; j < AA; j++) {
        
        }
    }
    */
    
    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    vec3 rd = setCamera(uv, ro, target);
    
    // calculate color based on distance, etc
    vec3 clr = render(ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
