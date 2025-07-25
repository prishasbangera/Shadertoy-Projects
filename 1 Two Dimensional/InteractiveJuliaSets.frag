/*


Interactive Julia Sets

Prisha B.
2021-11-26

Live code: https://www.shadertoy.com/view/ftG3RV

*/

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    vec2 res = iResolution.xy;

    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
    
    uv *= 0.8;
    
    vec3 clr = vec3(0.0);
    int iter = 0;
    const int MAX_ITER = 200;
    
    vec2 z0 = iMouse.xy / res * 2.0 - 1.0;
    vec2 z = uv * 2.0;
  
    while (iter < MAX_ITER) {
        vec2 z1 = vec2(z.x*z.x - z.y*z.y + z0.x, 2.0*z.x*z.y + z0.y);
        
        if (length(z1) > 2.0) break;
        else { 
            z = z1;
        }
        
        iter++;
    }

    clr += float(iter)/float(MAX_ITER); 
    
    fragColor = vec4(clr, 1);

}