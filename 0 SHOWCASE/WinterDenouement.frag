/*

winter denouement

Prisha B.
2022-07-08

Live code: https://www.shadertoy.com/view/sdKfDc

- (Unfinished) Attempting to Follow Painting a Landscape with Maths by Inigo Quilez
https://www.youtube.com/watch?v=BFld4EBO2RE
https://iquilezles.org/articles/morenoise/
https://www.shadertoy.com/view/4ttSWf

*/

// write color to buffer A
float PI = 3.14159265;
float  E = 2.71828182;
int AA = 3; // sqrt(samples per pixel)

/*******************************************************/

// return smoothstep and its derivative from https://www.shadertoy.com/view/4ttSWf (Inigo Quilez)
vec2 smoothstepd( float a, float b, float x) {
	if( x<a ) return vec2( 0.0, 0.0 );
	if( x>b ) return vec2( 1.0, 0.0 );
    float ir = 1.0/(b-a);
    x = (x-a)*ir;
    return vec2( x*x*(3.0-2.0*x), 6.0*x*(1.0-x)*ir );
}

float random(in vec2 pt) {
    vec2 uv = 50.0*(fract(pt / PI));
    return fract(uv.x * uv.y * (uv.x + uv.y));
}

// https://iquilezles.org/articles/morenoise/
float noise(in vec2 pt) {
    
    vec2 i = floor(pt); // integer component
    vec2 f = fract(pt); // fractional component
    f = 3.0 * f * f - 2.0 * f * f * f; // smooth interpolation
    
    // values of four corners
    float a = random(i + vec2(0, 0)),
          b = random(i + vec2(1, 0)),
          c = random(i + vec2(0, 1)),
          d = random(i + vec2(1, 1));
          
    float k0 = a,
          k1 = b - a,
          k2 = c - a,
          k3 = a - b - c + d;
          
    // interpolate between four values x * (1−a) + y * a
    return 2.0 * (k0 + k1*f.x + k2*f.y  + k3*f.x*f.y) - 1.0;      

}

// yz -> derivative, x -> noise value
// learn this later
vec3 noised(in vec2 pt) {
    
    vec2 i = floor(pt); // integer component
    vec2 f = fract(pt); // fractional component
    vec2 u = 3.0 * f * f - 2.0 * f * f * f; // smooth interpolation
    
    // heights of four corners
    float a = random(i + vec2(0, 0)),
          b = random(i + vec2(1, 0)),
          c = random(i + vec2(0, 1)),
          d = random(i + vec2(1, 1));
          
    float k0 = a,
          k1 = b - a,
          k2 = c - a,
          k3 = a - b - c + d;
          
    // interpolate between four heights (basically mix function)  x * (1−a) + y * a
    return vec3(
        2.0 * (k0 + k1*u.x + k2*u.y  + k3*u.x*u.y) - 1.0,
        2.0*(6.0*f*(1.0-f)) * vec2(k1 + k3*u.y, k2 + k3*u.x)
    );      

}

mat2 getRotMatrixFromTriangle(in float x, in float y, in float h) {
    // sin, cos, -cos, sin
    return mat2(y/h, x/h, -x/h, y/h);
}

float fbm(in vec2 uv, in mat2 rot, in int iterations) {
    float a = 0.0;
    for (int i = 0; i < iterations; i++) {
        vec2 t = pow(2.0, float(i)) * uv;
        for (int j = 0; j < i; j++) {
            t *= rot;
        }
        a += (1.0 / pow(2.0, float(i))) * noise(t);
    }
    return a;
}

mat2 rot;
mat2 rot2;

void initMatrices() {
    rot = getRotMatrixFromTriangle(3.0, 4.0, 5.0);
    rot2 = getRotMatrixFromTriangle(5.0, 12.0, 13.0);
}

// https://www.shadertoy.com/view/4ttSWf
vec3 fbmd(in vec2 uv, in mat2 rot, in int iterations) {
    float acc = 0.0;
    float k = 1.0;
    vec2 der = vec2(0);
    mat2  m = mat2(1.0, 0.0, 0.0, 1.0);
    vec2 t = uv;
    for (int i = 0; i <= iterations; i++) {
        vec3 n = noised(t); // calc noise & derivative
        acc += k*n.x; // accumulate val
        der += k*m*n.yz; // accumulate derivatives
        k *= 0.5; // half amplitude
        t *= rot*2.0; // double freq & rotate
        m *= 2.0*rot;
    }
    return vec3(acc, der);
}

/*******************************************************/

vec3 sunClr = vec3(11, 9, 5);
vec3 skyClr = vec3(0.56, 0.7, 1.0);
vec3 sunDir = normalize(vec3(0.1*float(-3.25), 0.1*float(3.5), 0.1*float(-2.5)));

/*******************************************************/

// TERRAIN

float terrainMap(in vec2 pt) {
    // noise terrain
    pt /= 2000.0;
    float a = fbm(pt, rot, 6);
    a = a * 600.0 + 600.0;
    // cliff
    a += 160.0 * smoothstep(-230.0, 40.0, a);
    // return height
    return a;
}

vec4 terrainMapD(in vec2 pt) {
    // noise derivative
    vec3 e = fbmd(pt / 2000.0, rot, 12);
    e.x = e.x * 600.0 + 600.0;
    e.yz *= 600.0;
    // cliff
    vec2 c = smoothstepd(-230.0, 40.0, e.x);
	e.x  = e.x  + 160.0*c.x;
	e.yz = e.yz + 160.0*c.y*e.yz; // chain rule (from https://www.shadertoy.com/view/4ttSWf)
    e.yz /= 2000.0;
    return vec4(e.x, normalize(vec3(-e.y, 1.0, -e.z)));
}

float raymarchTerrain(in vec3 ro, in vec3 rd) {

    // total distance traveled
    float td = 0.01;
    vec3 nor = vec3(0);
    
    for (int i = 0; i < 128; i++) {
        vec3 pt = ro + rd*td;
        // height of terrain
        float h = terrainMap(pt.xz);
        float d = 0.35 * (pt.y - h); 
        // if distance is close
        if (abs(d) < 0.0001*td) {
            break;
        }
        // add to total distance
        td += d;
        // if too far, break
        if (td >= 1800.0) {
            td = -1.0;
            break;
        }
    }
    
    return td;
    
}

vec3 terrainNormal(in vec3 pt, in int mode) {
    if (mode == 0) {
        return terrainMapD(pt.xz).yzw;
    } else {
        vec2 e = vec2(0.03,0.0);
        return normalize(vec3(
            terrainMap(pt.xz - e.xy) - terrainMap(pt.xz + e.xy),
            2.0*e.x,
            terrainMap(pt.xz - e.yx) - terrainMap(pt.xz + e.yx) 
        ));
    }
  
}

float terrainShadow(in vec3 ro, in vec3 rd, in float shadowSoftness) {

    // total distance traveled
    float td = 0.05;
    // shadow
    float sha = 1.0;
    
    for (int i = 0; i < 128 && td < 1800.0; i++) {
        vec3 pt = ro + rd*td;
        // height of terrain
        float h = terrainMap(pt.xz);
        float d = pt.y - h;
        // if distance is close
        if (d < td*0.0001)
            // intersection, so return shadow
            return 0.0;
        // add to total distance
        sha = min(sha, shadowSoftness * d/td);
        td += d;
    }
    
    return clamp(sha, 0.0, 1.0);
    
}

vec3 colorTerrain(in vec3 ro, in vec3 rd, in float d) {

    vec3 pt = ro + rd*d;
    vec3 tnor = terrainNormal(pt, 0);
    vec3 nor = terrainNormal(pt, 1);
    nor = mix(tnor, nor, smoothstep(0.0, 1.0, min(0.8, nor.y)));
    
    // base material color brown
    vec3 mat = vec3(0.13, 0.08, 0.06);
    vec3 clr = mat;
    // use normal y component to figure out grass and snow color
    float grass = smoothstep(0.6, 0.8, mix(tnor.y, nor.y, nor.y));
    float snow  = smoothstep(0.7, 0.95, 0.15*tnor.y + 0.85*nor.y);
    snow = snow*snow;
    
    // mix mat and grass and snow color
    vec3 snowClr = 0.65*vec3(0.1, 0.1, 0.25) + sunClr*0.005*dot(nor, sunDir);
    vec3 grassClr = vec3(0.07, 0.08, 0.005)*0.8 + snow*snowClr;
    clr = clr*(1.0 - grass) + grass*grassClr;
    
    // lighting
    vec3 light = vec3(0);
    light += max(dot(nor, sunDir), 0.0) * sunClr * terrainShadow(pt, sunDir, 40.0); // sun
    light += ((nor.y + 1.0) * 0.5) * skyClr * 0.5; // sky diffuse
    light += mat * 6.0 * dot(nor, -sunDir); // bounce
    
    clr *= light;
    
    return clr;
    
}

/*******************************************************/

// CLOUDS

float cloudMap(in vec3 pt) {
    // plane
    return dot(pt, vec3(0, -1, 0)) + 600.0;
}

float raymarchClouds(in vec3 ro, in vec3 rd) {

    // total distance traveled
    float td = 0.01;
    
    for (int i = 0; i < 128; i++) {
        float d = cloudMap(ro + rd*td);
        // if distance is close
        if (abs(d) < td*0.0001) {
            break;
        }
        // add to total distance
        td += d;
        // if too far, break
        if (td >= 5000.0) {
            td = -1.0;
            break;
        }
    }
    
    return td;
    
}

/*******************************************************/

vec4 render(in vec2 uv, in vec3 ro, in vec3 rd) {

    vec3 clr = skyClr - 0.4*uv.y;

    int mat = -1;
    float d = 6000.0;;
    
    // land
    {
        float d0 = raymarchTerrain(ro, rd);
        if (d0 > 0.0 && d0 < d) {
            mat = 0;
            d = d0;
        }
    }
    
    // clouds
    {
        float d1 = raymarchClouds(ro, rd);
        if (d1 > 0.0 && d1 < d) {
            mat = 1;
            d = d1;
        }
    }
    
    // material colors
    if (mat == 0) {
        clr = colorTerrain(ro, rd, d);
    } else if (mat == 1) {
        // mix sky and cloud clr
        vec3 pt = ro + rd*d;
        vec3 cl = 0.4 * vec3(smoothstep( 
            -0.05, 1.0, fbm(pt.xz * 0.003 + 10.5, getRotMatrixFromTriangle(5.0, 12.0, 13.0), 5)
        ));
        clr = clr*(1.0-cl) + cl;
    }
    
    // mix fog
    vec3 f = pow(vec3(2.718281), -0.0001*d*vec3(1, 2, 4));
    clr = f * clr + (1.0 - f) * vec3(0.9);
    
    // mix sun
    clr += sunClr * 0.05 * pow(dot(sunDir, rd), 10.0);

    clr.r = smoothstep(0.0, 1.0, clr.r);
    clr.g = smoothstep(0.0, 1.0, clr.g);
    clr.b = smoothstep(0.0, 1.0, clr.b);
    return vec4( pow(clr, vec3(0.4545)), 1.0 );
    
}

vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));
    return normalize(uv.x * right + uv.y * up + 1.2 * forward);
}

/*******************************************************/

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    vec3 clr = vec3(0.0);
    float d = 1.0;
    float time = iTime;
    
    initMatrices();
    
    // camera
    vec3 ro = vec3(-400, -300.0, -90) + vec3(130, 70, -240);
    vec3 target = ro + vec3(0.11, 0.1, -0.6) + vec3(-0.60, -0.1, 0.0);
    
    
    for (int i = 0; i < AA; i++) {
        for (int j = 0; j < AA; j++) {
            // Normalized pixel coordinates
            vec2 f = fragCoord + vec2(float(i), float(j)) / float(AA);
            vec2 uv = (2.0*f - iResolution.xy) / min(iResolution.x, iResolution.y);
            vec3 rd = setCamera(uv, ro, target);
            // calculate color based on distance, etc
            vec4 rendered = render(uv, ro, rd);
            if (i == 0 && j == 0) d = rendered.a;
            clr += rendered.rgb;
        }
    }

    clr /= float(AA * AA);
    
    // Output to screen
    fragColor = vec4(clr, d);

}