/*


Learning about value noise

Prisha B.
2021-09-12

Learning about noise from https://www.youtube.com/watch?v=zXsWftRdsvU

Live code: https://www.shadertoy.com/view/fsy3D1

*/

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
    
    // corners of grid cube
    // bottom face
    float lbf = random(id + vec3(0, 0, 0));
    float rbf = random(id + vec3(1, 0, 0));
    float lbb = random(id + vec3(0, 0, 1));
    float rbb = random(id + vec3(1, 0, 1));
    // lerp bottom face
    float bf = mix(lbf, rbf, fid.x);
    float bb = mix(lbb, rbb, fid.x);
    float b = mix(bf, bb, fid.z);
    
    // top face
    float ltf = random(id + vec3(0, 1, 0));
    float rtf = random(id + vec3(1, 1, 0));
    float ltb = random(id + vec3(0, 1, 1));
    float rtb = random(id + vec3(1, 1, 1));
    // lerp top face
    float tf = mix(ltf, rtf, fid.x);
    float tb = mix(ltb, rtb, fid.x);
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

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    vec2 uv = fragCoord/iResolution.xy;
    
    // pixel clr
    float c = fractalNoise(vec3(uv, 0.06 * iTime));

    // Output to screen
    fragColor = vec4(c, c, c, 1.0);
    
}