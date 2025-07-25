/*

Learning Again

(From https://shadertoyunofficial.wordpress.com/2019/01/02/programming-tricks-in-shadertoy-glsl/
and https://www.youtube.com/watch?v=khblXafu7iA)

Prisha B.
2024-06-28

Live Code: https://www.shadertoy.com/view/43dSD2
Another cool program (following same tutorial): https://www.shadertoy.com/view/43ySRK

*/

#define AA       1
#define MAX_DIST 100.0
#define CAM_DIST 2.0
#define PI       3.14159
#define FOV      0.9
#define CS(a)    vec2( cos(a), sin(a) )
#define rot(a)   mat2( cos(a), -sin(a), sin(a), cos(a) )

/***************************************************************************/

// https://www.shadertoy.com/view/4djSRW
#define hash21(p) fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453)
#define hash33(p) fract(sin( (p) * mat3( 127.1,311.7,74.7 , 269.5,183.3,246.1, 113.5,271.9,124.6) ) *43758.5453123)

/***************************************************************************/

// https://iquilezles.org/articles/smin/
float smin(float a, float b, float k) {
    k *= 4.0;
    // 0 to 1, spikes when a and b are near
    float h = max( k-abs(a-b), 0.0); 
    return min(a,b) - h*h/(4.0*k);
}

// 
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

/***************************************************************************/

float sdfOp(in vec3 pt) {

    float d = MAX_DIST;
    float time = iTime;
    
    // rotating cube and sphere
    {
        float sf = 1.2; //scaling factor
        vec3 p = pt- vec3(0,0.7,0);
        p.yz *= rot(PI/4.0 + iTime);    
        p.xz *= rot(PI/2.0 + iTime);


        d =  min( d, sdBox(p*sf, vec3(0.5)) / sf );
        d = smin( d, sdSphere(pt - 1.6 * vec3(sin(time * 0.7), 0.5, 0.0), 0.5), 0.2);
    }
    
    // repeating cubes
    {
        vec3 q = pt - vec3(2, -0.3, 2);
        vec3 m = vec3(1);
        q = mod(q, m) - m*0.5;
        d = smin(d, sdBox(q, vec3(0.1)) - 0.01, 0.1);
    }
    
    // floor
    {
        float fl = pt.y + 0.1;// - 0.1*cos(5.0 * atan(pt.z, pt.x));
        d = smin(d, fl, 0.1);
    }

    return d;

}

/***************************************************************************/

vec3 calcNormalOp(in vec3 pt) {
    vec2 h = vec2(0.001, 0);
    return normalize(vec3(
        sdfOp(pt + h.xyy) - sdfOp(pt - h.xyy),
        sdfOp(pt + h.yxy) - sdfOp(pt - h.yxy),
        sdfOp(pt + h.yyx) - sdfOp(pt - h.yyx)   
    ));
}

/***************************************************************************/

float raymarchOp(vec3 ro, vec3 rd, float tmin, float tmax, inout int steps) {

    float td = tmin;
    
    int i;
    for (i = 0; i < 80; i++) {
    
        vec3 p = ro + rd*td;
        
        // weird transform 1 from https://www.youtube.com/watch?v=khblXafu7iA
        p.xy *= rot(td * 0.15);
    
        float d = sdfOp(p);
        
        // weird transform 2
        rd.y += (d) * 0.02;
        
        td += d;
        
        if (abs(d) < 0.001 || td > tmax) break;
    
    }
    
    steps = i;
    return td;

}

/***************************************************************************/

vec3 render(in vec2 uv, in vec3 ro, in vec3 rd) {

    vec3 clr = vec3(1);
    
    int steps = 0;
    float d = raymarchOp(ro, rd, 0.01, MAX_DIST, steps);
    
    
    // vec3 nor = calcNormalOp(ro + rd*d);
    // clr = nor * 0.5 + 0.5;
    // clr = vec3(1.0 - d * 0.05 * d);
    // clr = vec3(smoothstep(25.0, 0.0, d*d));
    // clr = vec3(d * 0.12);
    
    
    clr = vec3(smoothstep(0.0, MAX_DIST * 0.2, d)) + 0.001*float(steps);

    
  //if(d > 0.0 && d < MAX_DIST) {
        // vec3 nor = calcNormalOp(ro + rd*d);
        //clr += 0.5 * (nor * 0.5 + 0.5);
  //}
    
    
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

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

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
        float phi   = max(PI*0.1, (mouse.y * 0.5 + 0.5) * 0.5 * PI);
        float theta = mouse.x * 2.0 * PI;
        float rad   = rho * sin(phi);
        ro = target + vec3( rad * cos(theta), rho * cos(phi), rad * sin(theta) );
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
