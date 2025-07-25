void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec4 clr = texture(iChannel0, fragCoord / iResolution.xy);
    if (length(clr.rgb) > 1.5) {
        fragColor = clr;
    } else {
        fragColor = vec4(0, 0, 0, 1);
    }
    
}