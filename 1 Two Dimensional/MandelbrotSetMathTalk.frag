/*

April 6 Mu Alpha Theta Math Talk - Mandelbrot

Prisha B.

2022-02-16

Live Code: https://www.shadertoy.com/view/stKXDD

*/

// OpenGl Shading Language (GLSL)

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    vec2 res = iResolution.xy;

    // Normalized pixel coordinates
    vec2 uv = (2.0*fragCoord - res) / min(res.x, res.y);
  
    vec3 clr = vec3(0.0); // color black
    int iter = 0; // number of iterations
    const int MAX_ITER = 100; // we can't go to infinity, so set a high number -> # of times to compute next term
    
    // note: terms are complex numbers. The x component represents the real part, the y represents the imaginary part
    // complex numbers -> a + bi (a is real part, b is imaginary part)
    // treat (a, b) like xy coordinates (this is a plane where the real part is the horizontal axis and the imaginary part is the y axis) 
    vec2 z0 = uv; // first term in sequence (choosen by fragment/pixel coordinate)
    vec2 z = z0; // current term in sequence -> start with first
  
    // while number of iterations is less than the max number
    while (iter < MAX_ITER) {
    
        // find the next term of the sequence
        /*
        
        Take previous term, z, and first term, z0 to find next term, z1
        
        This is the function to produce the next term in the sequence
        z1 = z^2 + z0
        
        We can't represent complex numbers in GLSL,so we have to expand this.
        Remember that complex numbers can be written as a + bi
         - z1 = x + yi
         - z  = a + bi
         - z0 = a0 + b0*i
        
        x + yi = (a + bi)^2 + a0 + b0*i
               = a^2 + 2abi + b^2*i^2 + a0 + b0*i
               = a^2 + a0 + -b^2 + 2abi + b0*i
               
        Group the real parts and imaginary parts together
        x + yi = [a^2-b^2+a0] + [2ab+b0]*i;
        
        Therefore the real part of the next term is a^2 - b^2 + a0
        The imaginary part is 2ab + b0
        
        NOTE: in code, z.x = a, z.y = b, z0.x = a0, z0.y = b0
        
        */
        vec2 z1 = vec2(
            z.x*z.x - z.y*z.y + z0.x, // real component - "x" axis
            2.0*z.x*z.y + z0.y // imaginary component - "y" axis
        );
        
        // if the new complex number is too far from the origin, chances are the sequence escapes to infinity
        if (length(z1) > 2.0)
            // therefore, stop loop if too far -> stop computing next terms
            break;
        else 
            // otherwise, set current term to next term, and the loop will continue
            z = z1;
            
        // add one to iter (increment count)
        iter++;
        
    }

    // if we got through all of the iterations -> it didn't escape to infinity
    if (iter == MAX_ITER)
        // it's part of the set -> color it black
        clr = vec3(0.0);
    else
        // if we went through less iterations than MAX_ITER, it's not part of set since it escaped to infinity
        // since iter will be some percentage of MAX_ITER, we can use it to color the pixel differently
        clr = vec3( float(iter)/float(MAX_ITER) ); 
    
    // set color output
    fragColor = vec4(clr, 1);

}