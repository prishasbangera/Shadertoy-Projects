/*

Randomness and Truchet Tiles

Prisha B.
2021-09-12

Live code: https://www.shadertoy.com/view/fsG3Wh

Learning about how to create pseudo-random numbers from https://thebookofshaders.com/10/

*/

float random(in vec2 v) {
    return fract(65465.1327854 * sin(dot(v, vec2(73.93422, 12.5165))));
}

vec3 tile(in vec2 pt) {

    vec2 f = fract(pt);
    float n = random(floor(pt));
    if (n > 0.75) {
        f = 1.0 - f;
    } else if (n > 0.5) {
        f = 1.0 - vec2(1.0 - f.x, f.y);
    } else if (n > 0.25) {
        f = vec2(1.0 - f.x, f.y);
    }
    
    // circles
    float l1 = length(f);
    float l2 = length(1.0-f);
    vec3 clr = vec3(step(l1, 0.6) - step(l1, 0.4) + step(l2, 0.6) - step(l2, 0.4));
    
    return clr;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - iResolution.xy) / min(iResolution.x, iResolution.y);
    
    vec2 pt = 15.0 * uv;
    
    vec3 clr = tile(pt);
    clr += 2.0 * vec3(0.03, 0.02, 0.1) * tile(pt + 0.3);
    clr += 0.5 * vec3(0.5, 0.05, 0.04) * tile(vec2(pt.x - 0.2, pt.y - 0.5));
    clr.y -= 0.9 * tile(pt - 0.05).y;
    clr.x += 0.7 * tile(pt + 0.15).x;
    
    vec2 shape = abs(uv) - vec2(0.5, 0.5);
    shape = shape + 0.05 * sin(20.0 * atan(shape.y, shape.x));
    if (length(shape) < 0.3 && length(shape) > 0.15) {
        clr += 10.0 * (tile(uv * pt) + 0.1) * vec3(0.1, 0.3, 5.5);
    }
    
    clr = pow(clr, vec3(0.4545)); 
    
    // Output to screen
    fragColor = vec4(clr, 1);

}