/*

It's a Donut Sandwich!

Prisha B.
2025-05-15

Link: https://www.shadertoy.com/view/l3Xyz8

Sources (more in code):
https://iquilezles.org/articles/distfunctions/
https://iquilezles.org/articles/rmshadows/

*/

#define AA       1
#define MAX_DIST 100.0
#define CAM_DIST 4.0
#define PI       3.14159
#define FOV      0.9
#define CS(a)    vec2( cos(a), sin(a) )
#define rot(a)   mat2( cos(a), -sin(a), sin(a), cos(a) )

/***************************************************************************/

// https://www.shadertoy.com/view/4djSRW
#define hash21(p) fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453)
#define hash33(p) fract(sin( (p) * mat3( 127.1,311.7,74.7 , 269.5,183.3,246.1, 113.5,271.9,124.6) ) *43758.5453123)

/***************************************************************************/

// constants
const int BOTTOM_DONUT = 1;
const int TOP_DONUT_LEFT = 2;
const int TOP_DONUT_RIGHT = 3;
const int FROSTING = 4;

/***************************************************************************/

struct Material {
    int id;
    vec3 clr;
};

Material defaultMaterial() {
    Material mat;
    mat.id = -1;
    mat.clr = vec3(0.2);
    return mat;
}

/***************************************************************************/

// https://iquilezles.org/articles/smin/
float smin(float a, float b, float k) {
    k *= 4.0;
    // 0 to 1, spikes when a and b are near
    float h = max( k-abs(a-b), 0.0); 
    return min(a,b) - h*h/(4.0*k);
}

// https://iquilezles.org/articles/smin/
float smax(float a, float b, float k) {
    k *= 4.0;
    float h = max( k-abs(a-b), 0.0);
    return max(a,b) + h*h/(4.0*k);

}

/***************************************************************************/

float sdSphere(in vec3 pt, in float r) {
    return length(pt) - r;
}

// https://www.youtube.com/watch?v=8--5LwHRhjk
float sdEllipsoid(in vec3 pt, in vec3 r) {
    float a = length(pt / r);
    return (a*a - a) / length(pt / r*r);
}

// https://www.youtube.com/watch?v=62-pRVZuS5c
float sdBox(in vec3 pt, in vec3 r) {
    return length(max(abs(pt) - r, vec3(0.0)));
}

// https://www.youtube.com/watch?v=Ff0jJyyiVyw
float sdTorus(vec3 pt, vec2 t) {
    float l = (length(pt.xz) - t.x);
    float d = length(vec2(l, pt.y));
    return d - t.y;
}

/***************************************************************************/

void setMaterialProperties(inout Material mat) {
    switch (mat.id) {
        case BOTTOM_DONUT:
            mat.clr = vec3(0.1, 0.01, 0.01);
            break;
        case TOP_DONUT_LEFT:
            mat.clr = vec3(0.3, 0.15, 0.3);
            break;
        case TOP_DONUT_RIGHT:
            mat.clr = vec3(0.2, 0.2, 0.05);
            break;
        case FROSTING:
            mat.clr = vec3(0.1, 0.09, 0.09);
            break;
        default:
            mat.clr = vec3(0.1);
            break;
    }
}

float sdfOp(in vec3 pt, inout Material mat) {


    float d = MAX_DIST;
    float time = iTime;
    
    // TODO: add bounding box
    
    // https://iquilezles.org/articles/distfunctions/
    
    float ang = atan(pt.x, pt.z);
    
    // donut thing
    {
    
        // top and bottom half
        vec3 p = pt;
        p.y = abs(p.y) - 0.13; // two donut halves separated by distance
        float donut = sdTorus(p, vec2(1.25, 0.65));
        donut = smax(donut, -p.y, 0.03);
        
        // twisty distortion
        donut -= 0.04*sin((ang + 0.9*length(p.xz)) * 10.0);
        
        // set id
        if (pt.y < 0.0) {
            mat.id = BOTTOM_DONUT;
        } else {
            if (p.x < 0.0) {
                mat.id = TOP_DONUT_LEFT;
            } else {
                mat.id = TOP_DONUT_RIGHT;
            }
        }
        
        d = min(donut, d);
    }
    
    // frosting
    {
        vec3 p = pt;
        p.y = abs(p.y) - 0.1;
        float frosting = length(pt.xz) - (1.92 + sin(ang * 8.0) * 0.05);
        frosting = smax(frosting, p.y, 0.02); // cut cylinder
        frosting = smax(frosting, -(length(p.xz) - 0.57), 0.02); // hole
        
        if (frosting < d) {
            d = frosting;
            mat.id = FROSTING;
        }
    }
    
    //d = min(d, sdSphere(pt, 2.0) - 0.2*sin(10.0*pt.x));
    
    // d = min(d, sdSphere(pt - vec3(0, 2, 0), 1.0));
    //d = smin(d, pt.y, 0.1);
     

    setMaterialProperties(mat);

    return d;

}

vec3 calcNormalOp(in vec3 pt) {
    vec2 h = vec2(0.001, 0);
    Material m;
    return normalize(vec3(
        sdfOp(pt + h.xyy, m) - sdfOp(pt - h.xyy, m),
        sdfOp(pt + h.yxy, m) - sdfOp(pt - h.yxy, m),
        sdfOp(pt + h.yyx, m) - sdfOp(pt - h.yyx, m)   
    ));
}

float raymarchOp(in vec3 ro, in vec3 rd, in float tmin, in float tmax, 
                 inout int steps, inout Material mat) {

    float td = tmin;
    
    int i;
    for (i = 0; i < 128; i++) {
    
        float d = sdfOp(ro + rd*td, mat);
        
        td += d;
        
        if (abs(d) < 0.001 || td > tmax) break;
    
    }
    
    steps = i;
    return td;

}

// https://iquilezles.org/articles/rmshadows/
float calcSoftShadow(in vec3 ro, in vec3 rd, in float tmin, in float tmax, in float k) {

    float td = tmin;
    Material mat;
    float res = 1.0;
    
    int i;
    for (i = 0; i < 182 && td < tmax; i++) {
    
        float d = sdfOp(ro + rd*td, mat);
                
        if (abs(d) < 0.001) {
            return 0.0;
        }
        
        res = min(res, k*d/td);
        
        td += d;

    }
    
    return res;
}

/***************************************************************************/

vec3 calcColor(in vec3 ro, in vec3 rd, in float d, in vec3 nor, in Material mat) {

    vec3 pt = ro + rd*d;
    
    // rainbow
    // clr = 0.9 * (nor * 0.5 + 0.5);

    vec3 clr = mat.clr;
    
    // LIGHTING
    
    float sha = calcSoftShadow(pt, vec3(1, 0, 0), 0.05, MAX_DIST, 10.0);
    
    vec3 light = vec3(mat.clr);
    light += vec3(2) * (0.3 + 0.7 * dot(nor, vec3(1, 0, 0))) * sha;
    
    clr *= light;

    return clr;
}

vec3 render(in vec2 uv, in vec3 ro, in vec3 rd) {

    vec3 clr = vec3(0.4);
    
    int steps = 0;
    Material opMat = defaultMaterial();
    float d = raymarchOp(ro, rd, 0.01, MAX_DIST, steps, opMat);
    
    
    vec3 nor = calcNormalOp(ro + rd*d);
    // clr = nor * 0.5 + 0.5;
    // clr = vec3(1.0 - d * 0.05 * d);
    // clr = vec3(smoothstep(25.0, 0.0, d*d));
    // clr = vec3(d * 0.12);
    
    clr += calcNormalOp(ro + rd*d);
    clr += vec3(smoothstep(0.0, MAX_DIST, d)) + 0.005*float(steps);

    if(d > 0.0 && d < MAX_DIST) {
        //vec3 nor = calcNormalOp(ro + rd*d);
        //clr = calcColor(ro, rd, d, nor, opMat);
    }

    clr = pow(clr, vec3(0.4545));

    return clr;

}

/***************************************************************************/

vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));
    // ray direction
    vec3 rd = normalize(uv.x * right + uv.y * up + FOV * forward);
    return rd;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    // if (iFrame != 0) discard;

    float time = iTime;
    vec2 res = iResolution.xy;
    vec2 mouse = (iMouse.xy * 2.0 - res.xy) / res.y;
    
    // target
    vec3 target = vec3(0, 0, 0);
    vec3 ro;
    
    // ray origin 
    // float movX = -20.0 * mouse.x/res.x + 10.0;
    // float movY = -20.0 * mouse.y/res.y + 10.0;
    // float r = 4.5;
    // vec3 ro = target + vec3(sin(movX) * r,  movY, cos(movX) * r);
    // vec3 ro = target + vec3(0, 0, 3);
    
    // ray origin - spherical coordinates
    { 
        float rho   = CAM_DIST; // distance
        float phi   = max(PI*0.1, (mouse.y * 0.5 + 0.5) * 0.5 * PI) + (sin(iTime)*PI*0.25-PI*0.5);
        float theta = mouse.x * 2.0 * PI + iTime*0.75;
        float rad   = rho * sin(phi);
        ro = target + vec3( rad * cos(theta),  rho * cos(phi), rad * sin(theta) );
    }
    
    // accumulate color
    vec3 clr = vec3(0.0);
    
    #if AA > 1
    
    for (int i = 0; i < AA; i++) {
    for (int j = 0; j < AA; j++) {


        // Normalized pixel coordinates
        vec2 f = fragCoord + vec2(float(i), float(j)) / float(AA);
        # else
        vec2 f = fragCoord;
        
    #endif
    
        vec2 uv = (2.0 * f - res) / res.y;
        vec3 rd = setCamera(uv, ro, target);

        // calculate color
        vec3 c = render(uv, ro, rd);

        clr += c;

    #if AA > 1    
    
    }}    
    
    clr /= float(AA*AA);
    
    #endif

    // Output to screen
    fragColor = vec4(clr, 1);
    
}
