/*

Eye

Prisha B.
2021-11-05

Live code: https://www.shadertoy.com/view/ftt3WN

Started from tutorial: https://www.youtube.com/watch?v=emjuqqyq_qc


*/

float random(in vec2 v) {
    return fract(15465.1327854 * sin(dot(v, vec2(173.93422, 102.5165))));
}

float noise(in vec2 uv) {
    
    vec2 fid = fract(uv); // fraction part of uv -> where in the grid
    fid = fid * fid * (3.0 - 2.0 * fid);
    vec2 id = floor(uv); // integer part of uvw -> which grid
    
    // corners of grid
    float bl = random(id + vec2(0, 0));
    float br = random(id + vec2(1, 0));
    float tl = random(id + vec2(0, 1));
    float tr = random(id + vec2(1, 1));
    
    // interpolate between corner
    float b = mix(bl, br, fid.x);
    float t = mix(tl, tr, fid.x);
    return mix(b, t, fid.y);
    
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    // normalized pixel coordinates
    vec2 res = iResolution.xy;
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y) * 1.2;
    // for two eyes
    
    // distance between pt and origin
    float d = length(uv);
    vec3 outerEyeClr = vec3(0.05, 0.3, 0.8);
    
    // black background
    vec3 clr = vec3(0.0);
    // noise
    clr += noise(uv * 3.0) * 0.1 * vec3(1.5, 0.1, 0.5);
    clr += noise(uv * 3.0 + 1.0) * 0.2 * vec3(0.0, 0.1, 1.3);
    clr += vec3(0.6, 0.06, 0.4) * 0.15 * sin(noise(uv) * uv.x * 10.0);
    clr *= 0.5;
    // blue/purple glow
    clr = mix(vec3(0.3, 0.1, 0.4) * 0.8, clr, smoothstep(d, 0.58, 0.73));
    clr = mix(outerEyeClr*5., clr, smoothstep(d, 0.64, 0.66));
    
    // stars
    float n = random(uv * 0.2); // random num based on coordinate
    if (n < 0.008) {
        clr += 0.6 * noise(vec2(uv * 50.0 + iTime));
    }
    
    if (d < 0.8) {
        // angle between center and pt
        float a = atan(uv.y, uv.x);
        // outer circle
        vec3 e = mix(vec3(0.35, 0.65, 0.14), outerEyeClr, smoothstep(0.3, 0.65, d));
        e += vec3(0.3, 0.35, 0.15)*1.2*(smoothstep(2.4, 3.14, a) + smoothstep(3.14, 4.94, 3.14-a));
        // noise
        e += noise(14.5 * vec2(cos(a), sin(a))) * 0.18;
        // vignette
        e = mix(e, vec3(0.02, 0.02, 0.2) * 0.1, smoothstep(0.45, 0.9, d));
        // center
        e = mix(e, vec3(0.1, 0.1, 0.15) * 0.7, smoothstep(0.28, 0.23, d));
        // shine
        float l = distance(uv, vec2(0.27));
        vec3 shineClr = vec3(0.8, 1.2, 0.7);
        e += shineClr * smoothstep(0.7, 0.0, l) * 0.4;
        e += shineClr * smoothstep(0.15, 0.0, l*0.5) * 0.3;
        // mix eye clr into background
        clr = mix(clr, e, smoothstep(0.74, 0.69, d));
    }

    fragColor = vec4(clr, 1.0);

}