/*

Volumetric Rendering

Prisha B.
2023-03-06

(Unfinished) Attempt to Follow Tutorial
https://wallisc.github.io/rendering/2020/05/02/Volumetric-Rendering-Part-1.html

More sources in code

Live code: https://www.shadertoy.com/view/DdXSWS


*/

// write color to buffer A
int AA = 1; // sqrt(samples per pixel)
float MAX_DIST = 32.0;
int MAX_STEPS = 128;
float PI = 3.14159265;

/*******************************************************/

struct PointLight {
    vec3 pos;
    vec3 clr;
    float rad;
    float fadeAdjust;
};

int NUM_LIGHTS = 3;

PointLight light1;
PointLight light2;
PointLight light3;

void initLights(float time) { 

    float r = 5.0;

    light1.clr = vec3(1, 3, 4);
    light1.rad = 0.2;
    light1.pos = vec3(r * sin(time), sin(time) + 2.0, r * 0.5 * cos(time * 0.5)); 
    light1.fadeAdjust = 0.5;
    
    light2.clr = vec3(5, 4, 2);
    light2.rad = 0.1;
    light2.pos = vec3(r * sin(time), 2.0, r * cos(time));
    light2.fadeAdjust = 0.6;
    
    light3.clr = vec3(3, 2, 5);
    light3.rad = 0.2;
    light3.pos = vec3(r * sin(time*0.5), 3.0 + sin(time), r * cos(time*0.8));
    light3.fadeAdjust = 0.6;
    
}

PointLight getLight(int id) {

    if (id == 1)
        return light1;
    if (id == 2)
        return light2;
    if (id == 3)
        return light3;
        
}

/*******************************************************/

mat2 getRotMatrixFromTriangle(in float x, in float y, in float h) {
    // sin, cos, -cos, sin
    return mat2(y/h, x/h, -x/h, y/h);
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

// SMOOTH MIN from Inigo Quilez
// https://iquilezles.org/articles/smin

float smoothmin(in float a, in float b, in float k) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
	return mix(b, a, h) - k*h*(1.0-h);
}

// smoothmax
float smoothmax( float a, float b, float k ) {
	float h = max(k-abs(a-b),0.0);
	return max(a, b) + h*h*0.25/k;
}

// https://www.youtube.com/watch?v=62-pRVZuS5c
float sdBox(vec3 pt, vec3 b) {
	vec3 q = abs(pt) - b;
	return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

/*******************************************************/

float sdLight(in vec3 pt, in PointLight li) {
    return length(pt - li.pos) - li.rad;
}

float sdfOp(in vec3 pt, inout float id) {

    // plane
    float d = pt.y + 1.0;
    id = 0.0;
    
    // lights
    
    float s1 = sdLight(pt, light1);
    if (s1 < d) {
        d = s1;
        id = 1.0;
    }
    
    float s2 = sdLight(pt, light2);
    if (s2 < d) {
        d = s2;
        id = 2.0;
    }
    
    float s3 = sdLight(pt, light3);
    if (s3 < d) {
        d = s3;
        id = 3.0;
    }
    
    return d;

}

// https://iquilezles.org/articles/normalsSDF
vec3 calcNormalOp(in vec3 pt) {

	vec2 h = vec2(0.001, 0);
    float id = -1.0;

    // central difference sdf(pt + EPSILON) - sdf(pt - EPSILON)    
	return normalize(vec3(
		sdfOp(pt + h.xyy, id) - sdfOp(pt - h.xyy, id),
		sdfOp(pt + h.yxy, id) - sdfOp(pt - h.yxy, id),
		sdfOp(pt + h.yyx, id) - sdfOp(pt - h.yyx, id)
	));

}


// returns closest distance and id
float raymarchOpaque(in vec3 ro, in vec3 rd, inout float id) {
    
    float td = 0.001;
    
    for (int i = 0; i < MAX_STEPS; i++) {
        float h = sdfOp(ro + rd*td, id);
        if (abs(h) < 0.0001*td) {
            return td;
        }
        td += h;
        if (td >= MAX_DIST) {
            id = -1.0;
            break;
        }
    }
    
    return MAX_DIST;
    
}

/*******************************************************/

mat2 rot;

void initMatrices() {
    rot = getRotMatrixFromTriangle(3.0, 4.0, 5.0);
}

float sdfTr(in vec3 pt) {

    float t = iTime;

    // cloud
    float d = length(pt - vec3(0.5 * sin(t*2.0 + 1.0), 2.0 + cos(t)*2.0, 0)) - 2.;
    d = smoothmin(d, length(pt - vec3(2.0 + cos(t), 3.0 + sin(t*3.0), 0)) - 1.0, 2.0);
    d = smoothmin(d, sdBox(pt - vec3(0, 1.5, 0), vec3(3.5 + 0.5*sin(t), 0.2, 3.5 + 0.7*cos(2.0*t))) - 1.0, 2.0);
    d = smoothmin(d, sdBox(pt - vec3(0, 1.2, 0), vec3(6.0, 0.1, 6.0)), 3.0);
    d -= 0.01 * sin(5.0 * pt.y * pt.x + t);
   
    // subtract lights
    d = smoothmax(d, -(sdLight(pt, light1) - light1.rad), 2.0);
    d = smoothmax(d, -(sdLight(pt, light2) - light2.rad), 2.0);
    d = smoothmax(d, -(sdLight(pt, light3) - light3.rad), 3.0);
    
    d -= 0.5*fbm(pt.xz * 0.5, rot, 4);
    
    return d;
    
}

// https://iquilezles.org/articles/normalsSDF
vec3 calcNormalTr(in vec3 pt) {

	vec2 h = vec2(0.001, 0);

    // central difference sdf(pt + EPSILON) - sdf(pt - EPSILON)    
	return normalize(vec3(
		sdfTr(pt + h.xyy) - sdfTr(pt - h.xyy),
		sdfTr(pt + h.yxy) - sdfTr(pt - h.yxy),
		sdfTr(pt + h.yyx) - sdfTr(pt - h.yyx)
	));

}

float raymarchTranslucent(in vec3 ro, in vec3 rd) {
    
    float td = 0.001;
    
    for (int i = 0; i < MAX_STEPS; i++) {
        float h = sdfTr(ro + rd*td);
        if (abs(h) < 0.0001*td) {
            return td;
        }
        td += h;
        if (td >= MAX_DIST) {
            break;
        }
    }
    
    return MAX_DIST;
    
}

/*******************************************************/

vec3 calcPointLight(in vec3 pt, in vec3 rd, in vec3 nor, in PointLight li) {

    // diffuse
    float dif = 0.5 + 0.5 * clamp(dot(nor, li.pos - pt), 0.0, 1.0);

    // brightness
    float d = distance(pt, li.pos);
    d = pow(d, li.fadeAdjust);
    float brightness = 1.0 / (d * d);

    return brightness * li.clr * (dif);
    
}

vec3 calcPointLight(in float dist, in PointLight li) {

    // brightness
    float d = pow(dist, li.fadeAdjust);
    float brightness = 1.0 / (d * d);

    return brightness * li.clr;
    
}

vec3 calcLighting(inout vec3 clr, in vec3 ro, in vec3 rd, in float d, in vec3 nor, in float id) {

    // important: right now, the lights have ids greater than 0.0
    if (id > 0.0) return clr;

    vec3 pt = ro + rd * d;
    vec3 light = vec3(0.0);
    
    light += calcPointLight(pt, rd, nor, light1);
    light += calcPointLight(pt, rd, nor, light2);
    light += calcPointLight(pt, rd, nor, light3);
    
    return clr * light;
    
}

/*******************************************************/

vec3 opaqueClr(in vec3 ro, in vec3 rd, in float d, in float id) {

    vec3 clr = vec3(0.0);
    
    if (id == 0.0) {
        vec3 p = ro + rd*d;
        float s = 0.25;
        int checker = int(round(fract(p.x*s))) ^ int(round(fract(p.z*s)));
        clr = vec3(0.12) + 0.02 * float(checker);
    } else if (id == 1.0) {
        clr = light1.clr;
    } else if (id == 2.0) {
        clr = light2.clr;
    } else if (id == 3.0) {
        clr = light3.clr;
    }
    
    if (id > 0.0)
        clr = normalize(clr) * 1.5;
    
    return clr;
    
}

/*******************************************************/

vec4 render(in vec2 uv, in vec3 ro, in vec3 rd) {

    float depth = MAX_DIST;
    vec3 clr = vec3(0.0);
    vec3 opClr = vec3(0.0);
    float id = -1.0;
    
    // calculate distance to and normal for opaque object if hit
    float opD = raymarchOpaque(ro, rd, id);
    vec3 opNor = calcNormalOp(ro + rd*opD);
    if (id > -1.0) {
        depth = opD;
        opClr = opaqueClr(ro, rd, opD, id);
    }
    // point lights
    opClr = calcLighting(opClr, ro, rd, opD, opNor, id);
    clr = opClr;
    
    // calculate translucent
    float trD = raymarchTranslucent(ro, rd);
    
    // if ray hit a volumetric object

    if (trD < opD) {
    
        float opaqueVis = 1.0;
        vec3 volAlbedo = vec3(0.3);
        float marchSize = 0.25;
        vec3 trClr = vec3(0.0);
        vec3 trNor = calcNormalTr(ro + rd*trD);
    
        for (int i = 0; i < MAX_STEPS; i++) {
            trD += marchSize;
            if (trD > opD) break;

            if (sdfTr(ro + rd*trD) < MAX_DIST) {
            
                float prevOpaqueVis = opaqueVis;
                // Beer Lambert Law absorption coeff, path length
                opaqueVis *= exp(-0.3 * marchSize);
                float marchAbsorption = prevOpaqueVis - opaqueVis; // absorption from this step
                
                for (int lightInd = 0; lightInd < NUM_LIGHTS; lightInd++) {
                    PointLight currLight = getLight(lightInd + 1);
                    float lightDist = length(currLight.pos - (ro + rd*trD));
                    vec3 lightClr = calcPointLight(lightDist, currLight); 
                    trClr += marchAbsorption * volAlbedo * lightClr * 0.7;
                }
                
                // get ambient light
                trClr += marchAbsorption * volAlbedo * opClr;
                
            } else break;
        }
        
        clr = trClr;
        
    }

    clr.r = smoothstep(0.0, 1.0, clr.r);
    clr.g = smoothstep(0.0, 1.0, clr.g);
    clr.b = smoothstep(0.0, 1.0, clr.b);
    return vec4( pow(clr, vec3(0.4545)), 1.0 );
    
}

/*******************************************************/

vec3 setCamera(in vec2 uv, in vec3 ro, in vec3 target) {
    vec3 forward = normalize(target - ro);
    vec3 right = normalize(cross(forward, vec3(0, 1, 0)));
    vec3 up = normalize(cross(right, forward));
    return normalize(uv.x * right + uv.y * up + 1.2 * forward);
}

/*******************************************************/

void mainImage(out vec4 fragColor, in vec2 fragCoord) {

    initMatrices();

    vec3 clr = vec3(0.0);
    float d = 1.0;
    float time = iTime;
       
    initLights(time);  
        
    // camera
    float r = 7.0;
    vec3 ro = vec3(r*cos(time * 0.2), 5.0, -r*sin(time * 0.2));
    vec3 target = vec3(0.0);
    
    
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