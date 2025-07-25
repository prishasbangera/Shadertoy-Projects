/*

Simple 3d - Following Tutorial

Prisha B.
2023-05-12

Attempt to Follow:
https://www.youtube.com/watch?v=dKA5ZVALOhs

Live code: https://www.shadertoy.com/view/Dlt3W2


*/

// const int AA = 1;

/************************************************************/

// distance from point in 3d space to point on rd
float distLine(vec3 ro, vec3 rd, vec3 pt) {
    return length(cross(pt - ro, rd))/length(rd);
}

/************************************************************/

// point
float point(vec3 ro, vec3 rd, vec3 pos) {
    return smoothstep(0.05, 0.04, distLine(ro, rd, pos));
}

float point(vec3 ro, vec3 rd, vec3 pos, float r1, float r2) {
    return smoothstep(r1, r2, distLine(ro, rd, pos));
}

/************************************************************/

vec3 render(vec2 uv, vec3 ro, vec3 rd) {
    
    float t = iTime;
    vec3 clr = vec3(0);
    
    for (int j = 0; j < 3; j++) {
        float t2 = t + 15.0*float(j);        
        for (int i = 0; i < 50; i++) {
            clr += point( ro, rd, vec3( cos(t2 + float(i)), sin(t2 + float(i)), int(t2*3.0 + float(i)/10.0)%20 )); 
        }
    }
    
    return clr;
    
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    // normalized coordinates
    vec2 uv = fragCoord.xy / iResolution.xy - 0.5;
    uv.x *= iResolution.x/iResolution.y;
    
    // ray origin
    vec3 ro = vec3(0.0, 0.0, -2.0);
    
    // ray direction
    vec3 rd = vec3(uv.x, uv.y, 0) - ro;
    
    vec3 clr = render(uv, ro, rd);
    
    // Output to screen
    fragColor = vec4(clr, 1.0);
    
}