/*

Infinity Unknown

Prisha B.
2021-11-19

Link: https://www.shadertoy.com/view/NsKXR3

Sources of learning from Inigo Quilez's videos and articles, 
The Book of Shaders, and the Art of Code YouTube channel.

Specific Sources for Learning:
- https://thebookofshaders.com/10/
- https://www.iquilezles.org/www/articles/smin/smin.htm
- https://www.youtube.com/watch?v=62-pRVZuS5c
- https://www.iquilezles.org/www/articles/normalsSDF/normalsSDF.htm
- https://www.iquilezles.org/www/articles/rmshadows/rmshadows.htm
- https://www.shadertoy.com/view/3lsSzf
- https://www.iquilezles.org/www/articles/fog/fog.htm
- https://www.youtube.com/watch?v=Cfe5UQ-1L9Q
- https://learnopengl.com/Getting-started/Camera

View it on Khan Academy (very different):
https://www.khanacademy.org/computer-programming/-/5378626088386560?width=600&height=450

*/

const float EPSILON = 0.001;
const float MAX_DIST = 70.0;

//*******************************************************//

// Light struct
struct Light {
    vec3 clr;
    vec3 dir;
    float shadowSoftness;
};

// Material structure
struct Material {
    vec3 clr;
    float amb;
    float dif;
    float spec;
    float shininess;
    vec3 ref;
    float id;
};

// function to return default material
Material defaultMaterial() {
    Material mat;
    mat.amb = 0.1;
    mat.clr = vec3(0.05);
    mat.dif = 1.0;
    mat.spec = 1.0;
    mat.shininess = 10.0;
    mat.ref = vec3(0.0);
    mat.id = -1.0;
    return mat;
}

//*******************************************************//

// clamp value from 0 to 1
float uclamp(float val) {
    return clamp(val, 0.0, 1.0);
}

//*******************************************************//

// random value from 0 to 1
// https://thebookofshaders.com/10/
float random(in vec2 v) {
    return fract(15465.1327854 * sin(dot(v, vec2(173.93422, 102.5165))));
}

//*******************************************************//

// https://iquilezles.org/articles/smin

// smooth min
float smoothmin(in float a, in float b, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(b, a, h) - k*h*(1.0-h);
}

// smooth max
float smoothmax( float a, float b, float k ) {
    float h = max(k-abs(a-b),0.0);
    return max(a, b) + h*h*0.25/k;
}

// Smooth min for distance and color
// returns rgb and d in vec4
vec4 smoothmin(in float a, in float b, in vec3 clr1, in vec3 clr2, in float k) {

   float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
   
   // distance
   float d = mix(b, a, h) - k*h*(1.0-h);
   // color
   vec3 c = mix(clr2, clr1, smoothstep(0.0, 1.0, h));
   
   return vec4(c, d);
   
}

//*******************************************************//

// SDFs

// SDF box
// https://www.youtube.com/watch?v=62-pRVZuS5c
float sdBox(vec3 pt, vec3 b) {
	vec3 q = abs(pt) - b;
	return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

//*******************************************************//


// MAIN SDF

float sdf(in vec3 pt, out Material mat) {

    // defaults
    mat = defaultMaterial();
    
    // distance to closest object
    float res;
    
    // sand
    vec3 sandClr;
    float sand;
    {
    
        // sand clr
        sandClr = vec3(0.13, 0.13, 0.08) * 0.8;
        sandClr.rg += random(pt.xz*10.9)*0.05;
        sand = pt.y + 2.35;
       
        // mountain range
        float h = 2.4 + 0.35*texture(iChannel1, pt.xz*0.02).r + 0.6*texture(iChannel0, pt.xz*0.05).r*smoothstep(-20.0, -19.9, pt.z); 
        sand -= h*smoothstep(0.0, 20.0, abs(pt.x-10.0))*(0.9*sin(pt.z*0.45)+0.9)*smoothstep(15.0, 30.0, length(pt));
        
        // plane distortion by texture -> "sand"
        sand += (0.1*texture(iChannel1, pt.xz*0.1).r + 0.05*texture(iChannel1, pt.xz*0.2).r);
        
    }
    
    // path
    vec3 pathClr;
    float path;
    {
    
        // path clr
        pathClr = vec3(0.17, 0.16, 0.09) * 0.5;
        pathClr.rgb += texture(iChannel0, pt.zx*0.25).r * 0.2;
   
        // path shape -> distort x by z value of pt
        path = sdBox(
            pt - vec3(sin(pt.z) + 10.0*smoothstep(3.0, -20.0, pt.z) - 0.3, -2.35, 0), 
            vec3(2.7, 0.2, 40.0)
        );
        // distort by texture (bricks)
        path -= pathClr.r * (0.2 * smoothstep(-4.0, 3.0, pt.z) + 0.15);
        
        // add noise to path clr
        pathClr.rgb += texture(iChannel1, pt.zx*0.03).r * 0.05;
       
    }

    // blend distance and clr (sand and path)
    vec4 blend = smoothmin(sand, path, sandClr, pathClr, 0.75);
    res = blend.w;

    // material
    mat.clr = blend.rgb;
    mat.id = 0.0;
    mat.shininess = 10.0;
    mat.spec = 0.2;

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
    
    for (int i = 0; i < 256; i++) {
        float h = sdf(ro + td*rd, mat);
        // if distance is really close, break
        if (abs(h) < (0.0001*td)) break;
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

// https://iquilezles.org/articles/rmshadows
float softShadow(in vec3 ro, in vec3 rd, in float k) {

    float res = 1.0; // result
    float td = 0.05; // total distance traveled
    
    for (int i = 0; i < 256 && td < MAX_DIST; i++) {
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
float calcOcc(in vec3 pt, in vec3 nor) {

    float occ = 0.0;
    float scl = 1.0;
    
    Material m; // placeholder
    
    for (int i = 0; i < 4; i++) {
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
    
    // mix sun clr with sky clr to get fog clr
    vec3 fogClr = mix( skyClr, sunClr, pow(max(dot(rd, sunDir), 0.0), 15.0) );
    
    // mix pixel clr with fog clr
    return mix(clr, fogClr, 1.0 - exp(-0.0025 * d * d)); // fog
    
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

vec3 calcClr(in vec2 uv, in vec3 ro, in vec3 rd, in float d, in vec3 nor, in Material mat) {

    // from camera to point in scene
    vec3 pt = ro + rd * d;

    // SKY CLR
    vec3 skyClr = vec3(1.2, 0.65, 0.8);
    skyClr -= 0.9*smoothstep(0.5, 2.0, uv.y);
    
    // KEY LIGHT
    Light sun;
    sun.clr = vec3(1.1, 0.9, 0.5) * 4.0;
    sun.dir = normalize(vec3(0.8, 0.2, -0.4));
    sun.shadowSoftness = 20.0;
    
    // background color
    vec3 shine = sun.clr * 0.15 * pow(max(dot(sun.dir, rd), 0.0), 13.0);
    
    // return background if too far (id is -1.0)
    if (mat.id == -1.0) {
    
        // stars
        float scl = 45.0;
        vec2 fid = fract(uv * scl); // fractional component
        vec2 id = floor(uv * scl); // integer component
        vec3 starClr;
        float circle = smoothstep(0.2*smoothstep(scl*0.3, scl, id.y)*random(id), 0.0, length(fid-vec2(0.5)));
        float n = smoothstep(0.0, scl*0.9, id.y) * texture(iChannel1, uv*0.5).r;
        starClr += random(id) + id.y*0.001 > 0.95 ? circle*n : 0.0;
        // add star clr to sky clr
        skyClr += 0.7*starClr;
        
        // return sky
        return skyClr + shine;
        
    }
    
    // material id is not -1.0, so we hit an obj
    vec3 clr = mat.clr;
    
    // CALCULATE COLOR
    float occ = calcOcc(pt, nor); // ambient occlusion
    vec3 light = vec3(mat.amb); // ambient
    light += calcLighting(pt, rd, nor, sun, mat) * occ; // sun
    light += uclamp(dot(nor, vec3(0,  1, 0))) * skyClr * occ; // sky diffuse
    clr *= light;
    
    // apply fod
    clr = applyFog(rd, d, clr, sun.clr * 0.17, sun.dir, skyClr);
    
    return clr + shine;

}

//*******************************************************//

vec3 render(in vec2 uv, in vec3 ro, in vec3 rd) {
    
    // material and clr
    Material mat;
    vec3 clr = vec3(0);

    // get distance to point
    float d = castRay(ro, rd, mat);
    // surface normal
    vec3 nor = calcNormal(ro + rd*d);
    
    // calculate the color of the pixel
    clr = calcClr(uv, ro, rd, d, nor, mat);
    
    // gamma correction
    clr = pow(clr, vec3(1.0 / 2.2)); 
    
    return clr;
    
}

//*******************************************************//

// https://www.youtube.com/watch?v=Cfe5UQ-1L9Q
// https://learnopengl.com/Getting-started/Camera
vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target) {

    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));
    
    // ray direction
    vec3 rd = normalize(uv.x * right + uv.y * up + 1.2 * forward);
    
    return rd;
    
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    // resolution
    vec2 res = iResolution.xy;
    
    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    // target
    vec3 target = vec3(0, -0.5, 0);
    // ray origin
    vec3 ro = vec3(0.0, 0.2, 8.0);
    
    // set camera
    vec3 rd = setCamera(uv, ro, target);
    
    // calculate color based on distance, etc
    vec3 clr = render(uv, ro, rd);

    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}
