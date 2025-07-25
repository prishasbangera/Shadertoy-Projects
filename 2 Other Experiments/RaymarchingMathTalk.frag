/*

Mu Alpha Theta Math Talk: Raymarching

Prisha B.
2022-08-31


Live code: https://www.shadertoy.com/view/stKcRc

Sources for learning:
youtube.com/watch?v=u5HAYVHsasc
youtube.com/watch?v=PGtv-dBi2wE

*/

// this function calculates the distance from the current point to the closest surface
float sdf(vec3 pt) {

    // sphere with radius 6 centered at origin
    float d = length(pt) - 6.0;
    
    // remove this line to see the sphere
    // sphere displacement - add or substract to the radius according to a sin function of the x coord
    d -= 0.7 * sin(pt.x - iTime*2.0); // use iTime so that it changes over time (horizontal transform)
    
    // uncomment to add another sphere
    // sphere with radius 2, centered at vec3(-7, 2, -3)
    // note that the lighting is not accurate rn for multiple shapes since there are no shadows
    
    // float s2 = length(pt - vec3(-7, 2, -3)) - 1.0;
    // the closest surface is the minimum of the two sdf values
    // d = min(d, s2);
    
    return d;
}

// Ultimately, this function runs for each pixel

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    
    // Normalized pixel coordinate system
    // This transforms the x values from -1 to 1 and the height accordingly
    vec2 uv = vec2(fragCoord - 0.5*iResolution.xy) / min(iResolution.x, iResolution.y);
    
    // simplified camera
    // ray origin - the location of the camera
    vec3 ro = vec3(0.0, 0, -20.0);
    // ray direction - direction that camera points to (each pixel)
    // normalize - the length of the ray vector equals 1
    vec3 rd = normalize(vec3(uv, 1.0));
    
    // sky color
    vec3 skyColor = vec3(0.5, 0.5, 1.9); // blue
    
    // color of pixel (rgb)
    vec3 clr = skyColor; // default - sky color 
    
    // raymarch
    float totalDist = 0.0; // total distance travelled
    
    // from i = 0 to 63, do the following inside this loop
    for(int i = 0; i < 128; i++) {
        
        // this is the current point being evaluated
        // ro + the total distance travelled * ray direction - scaling a vector then adding the origin
        vec3 pt = ro + rd*totalDist;
        
        // signed distance
        // if pt is outside the surface, the value is the positive distance to the surface of the sphere
        // if pt is inside the surface, he value is negative
        float d = sdf(pt);
        
        // if the distance to the sphere's surface is really small
        if (d < 0.0001) {
        
            // we found the point of intersection
            
            // calculate surface normal - central difference - estimate slope/derivative (gradient)
            vec2 h = vec2(0.001, 0);
            vec3 nor = normalize(vec3(
                sdf(pt + h.xyy) - sdf(pt - h.xyy),
                sdf(pt + h.yxy) - sdf(pt - h.yxy),
                sdf(pt + h.yyx) - sdf(pt - h.yyx)
            ));
            
            // calculate the color of the point
            clr = vec3(0.09, 0.025, 0.02); // rgb - red material color
           
            
            // LIGHTING
            vec3 light = vec3(0.0);
            
            {
                
                // sky diffuse - fresnel
                // at a glancing angle, add some blue to the red color
                float fresnel = pow((1.0 - max(0.0, dot(nor, -rd))), 5.0);
                light += 20.0 * skyColor * fresnel;

                // sunlight
                vec3 sunDirection = vec3(1, 1.5, -3);
                // use the surface normal and figure out how aligned it is with the sun's direction
                // the multiply by the sun's color
                light += max(0.0, dot(nor, sunDirection)) * vec3(3.0, 3.0, 2.5) * 1.2;
            
            }
           
            clr *= light;
            
            break; // stop the loop
            
        }
        
        // else, the point is not close enough to any surface
        // add d to total distance travelled to "march" along the ray
        totalDist += d;
        
        // if the distance travelled is too far, stop the loop
        if (totalDist >= 100.0) {
            break;
        }
        
        // otherwise, the loop will be repeated

    }
    
    clr = smoothstep(0.0, 1.0, clr); // multiply a smoothstep curve to the color - saturation
    clr = pow(clr, vec3(0.4545)); // gamma correction
    
    // assign the color to the pixel
    fragColor = vec4(clr, 1.0);
    
    
}