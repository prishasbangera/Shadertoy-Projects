void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;    
    
    vec3 clr = texture(iChannel0, uv).rgb;
    
#if 0
    clr += 0.02*texture(iChannel0, uv + vec2(0.01, 0)).r;
    clr += 0.02*texture(iChannel0, uv - vec2(0.01, 0)).g;
    clr += 0.02*texture(iChannel0, uv - vec2(0, 0.001)).b;
#endif
    
    fragColor = vec4(clr, 1.0);
}