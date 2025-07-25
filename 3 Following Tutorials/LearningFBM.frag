/*

Learning about FBM

Prisha B.
Date unknown

Learning about fbm from
https://thebookofshaders.com/13/

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

    // skew uvw
    //uvw.x *= 1.1547;
    //uvw.y += 0.5 * uvw.x;
    
    
    
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

float fbm1(in vec3 uvw) {

    float n = 0.0;
    float amp = 0.5;
    vec3 freq = uvw;
    
    int octaves = 6;
    
    for (int i = 0; i < octaves; i++) {
        n += noise(freq) * amp;
        freq *= 2.0; //lacunarity
        amp *= 0.5; // gain
    }
    
    return n;
    
}

float fbm2(in vec3 uvw) {

    float n = 0.0;
    float amp = 0.5;
    vec3 freq = uvw;
    
    int octaves = 6;
    
    for (int i = 0; i < octaves; i++) {
        n += abs(noise(freq) * 2.0 - 1.0) * amp;
        freq *= 2.0; //lacunarity
        amp *= 0.5; // gain
    }
    
    return n;
    
}


void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    vec2 uv = fragCoord/iResolution.xy;
    uv.x += fbm1(vec3(uv * 5.0, 1.0));
    
    // pixel clr
    float n = fbm1(vec3(uv * 5.0, 0.2 * iTime));
    n = 1.0 - n;
    n *= n;
    //n = n > 0.5 ? 1.0 : 0.0;
    
    float c = n;

    // Output to screen
    fragColor = vec4(c, c, c, 1.0);
    
}