vec3 getColor(in vec2 fragCoord, in int tx, in int ty) {
    vec2 uv = (fragCoord + vec2(tx, ty)) / iResolution.xy;
    return texture(iChannel1, uv).rgb;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    vec2 uv = fragCoord / iResolution.xy;
    
    vec3 clr = texture(iChannel0, uv).rgb;
    
    vec3 bloom = vec3(0.0);
    
    // blur 
    /*
        int s = 20;
        for (int i = -s; i <= s; i++) {
            for (int j = -s; j <= s; j++) {

                bloom += getColor(fragCoord, i, j) * 0.15 * smoothstep(5.0, 0.0, length(vec2(i, j)));

            }
        }
       
    bloom /= vec3(9.0);
    
    clr += bloom;
    */
    
    fragColor = vec4(clr, 1.0);
    
}