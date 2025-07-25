// write color to buffer A
float MAX_DIST = 100.0;
float EPSILON = 0.001;
int MAX_STEPS = 200;
int AA = 1;

/*******************************************************/

// Light struct
struct Light {
    bool isPointLight;
    vec3 clr;
    float shadowSoftness; // higher number -> crisper shadows
    // if isPointLight, set position, else set direction
    vec3 pos;
    vec3 dir;
    float brightness;
};

// create a light
Light createLight(in vec3 pt, in bool isPointLight, in float fadeAdjust, in float shadowSoftness, in vec3 dirOrPos, in vec3 clr) {

    Light light;
    light.clr = clr;
    light.shadowSoftness = shadowSoftness;

    if (isPointLight) {
        // point light
        light.pos = dirOrPos;
        light.isPointLight = true;
        // calculate brightness and direction
        float d = distance(pt, light.pos);
        d = pow(d, fadeAdjust);
        light.brightness = 1.0 / (d * d);
        light.dir = normalize(light.pos - pt);
    } else {
		// directional light
        light.brightness = 1.0;
        light.dir = dirOrPos;
    }

    return light;

}

// light object positions
vec3 light1 = vec3(2.5, 2.5, 1.5);
vec3 light2 = vec3(0, 0, 6.8);

/*******************************************************/

struct Material {
    vec3 clr;
    int id;
    float dif;
    float spec;
    float amb;
    float shininess;
    bool isLightObj;
};

Material defaultMaterial() {
    Material mat;
    mat.clr = vec3(0.2);
    mat.id = 0;
    mat.dif = 1.0;
    mat.spec = 1.0;
    mat.amb = 0.05;
    mat.shininess = 20.0;
    mat.isLightObj = false;
    return mat;
}

/*******************************************************/

float uclamp(in float val) {
    return clamp(val, 0.0, 1.0);
}

float dot2( in vec2 v ) { return dot(v,v); }

/*******************************************************/

void compareDist(inout float currDist, in float newDist, inout Material currMat, in Material newMat) {
    if (newDist < currDist) {
        currDist = newDist;
        currMat = newMat;
    }
}

// primitives
// https://iquilezles.org/articles/distfunctions/

float sdBox(vec3 pt, vec3 b) {
	vec3 q = abs(pt) - b;
	return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// From https://iquilezles.org/articles/distfunctions/
float sdCappedCone( vec3 p, float h, float r1, float r2 )
{
  vec2 q = vec2( length(p.xz), p.y );
  vec2 k1 = vec2(r2,h);
  vec2 k2 = vec2(r2-r1,2.0*h);
  vec2 ca = vec2(q.x-min(q.x,(q.y<0.0)?r1:r2), abs(q.y)-h);
  vec2 cb = q - k1 + k2*clamp( dot(k1-q,k2)/dot2(k2), 0.0, 1.0 );
  float s = (cb.x<0.0 && ca.y<0.0) ? -1.0 : 1.0;
  return s*sqrt( min(dot2(ca),dot2(cb)) );
}

/*******************************************************/

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

/*******************************************************/

float sdGround(vec3 pt, inout Material mat) {

    float d = MAX_DIST;
    
    mat.clr = vec3(0.15, 0.5, 0.4) * 0.05;
    mat.dif = 1.0;
    mat.shininess = 3.0;
    mat.spec = 4.0;
    
    vec3 p = pt - vec3(0, -33, 0);
    d = length(p) - 25.0;
    
    d = smoothmin(d, pt.y + 10.0, 1.0);


    return d;
    
}

float sdLampLight(vec3 pt, inout Material mat) {

    mat.clr = vec3(5, 10, 1.0 - pt.y*pt.y);
    
    float d = MAX_DIST;
   
    float l = sdCappedCone(pt, 0.9, 0.5, 0.9) - 0.05;
   
    d = min(d, l);
    
    return d;
}

float sdLamp(vec3 pt, inout Material mat) {
    
    float d = MAX_DIST;
    
    // pole
    vec3 p = pt;
    {
        float pole = length(p.xz) - (0.3 - 0.2 * smoothstep(-4.0, 6.0, pt.y));
        pole = smoothmax(pole, abs(p.y) - 6.0, 0.3);

        vec3 mp = p - vec3(0, 3.0, 0);
        float mid = length(mp.xz) - 0.33;
        mid = smoothmax(mid, abs(mp.y) - 0.23, 0.15);
        float mid2 = length(mp.xz) - 0.22;
        mid2 = smoothmax(mid2, abs(mp.y) - 0.6, 0.15);
        mid = smoothmin(mid, mid2, 0.1);
        pole = smoothmin(pole, mid, 0.1);

        if (pole < d) {
            d = pole;
            mat.clr = vec3(0.03, 0.03, 0.05);
            mat.dif = 0.25;
            mat.spec = 20.0;
            mat.shininess = 30.0;
        }
    }
    
    // base
    {
        vec3 b = p - vec3(0, -6, 0);
        float ang = atan(b.z, b.x);
        float base = length(b.xz) - (1.1 - 0.85 * smoothstep(-3.0, 3.5, b.y));
        base = smoothmax(base, abs(b.y) - 2.0, 0.2);
        base -= 0.04 * sin(ang * 10.0) * smoothstep(-8.0, -5.0, pt.y);
        
        // bottom
        vec3 q = b - vec3(0, -1.5, 0);
        // rotate by 45
        float s = sqrt(2.0) * 0.5;
        vec3 qRotated = q;
        qRotated.x = q.x*s - q.z*s;
        qRotated.z = q.x*s + q.z*s;
        float r = 1.25;
        float bottom = sdBox(qRotated, vec3(r, 0.3, r));
        bottom = smoothmax(bottom, sdBox(q, vec3(r - 0.08, 3.0, r - 0.08)), 0.1);
        base = smoothmin(base, bottom, 0.2);
        //base = min(base, sdBox(qRotated - vec3(0, 1.0, 0), vec3(r*0.2, 0.2, r*0.2)) - 0.8);
        base = smoothmin(base, sdBox(qRotated, vec3(r - 0.3, 0.2, r - 0.3)) - 0.05, 0.2);
        
        // rings
        r *= 0.23;
        vec3 rpos = qRotated - vec3(0, 4.1, 0);
        rpos.y = abs(rpos.y);
        float rings = sdBox(rpos - vec3(0, 0.25, 0), vec3(r, 0.05, r)) - 0.1;
        base = smoothmin(base, rings, 0.2);
        
        
        d = smoothmin(d, base, 0.2);
    }
        
    
    
    return d;
    
}

float sdf(vec3 pt, inout Material mat) {

    mat = defaultMaterial(); 
    float d = MAX_DIST;
    
    // ground
    {
        Material groundMat = defaultMaterial();
        float ground = sdGround(pt, groundMat);
        compareDist(d, ground, mat, groundMat);
    }
    
    // Light - lamp
    {
        Material m = defaultMaterial();
        float lampLight = sdLampLight(pt - vec3(0, light2.z, 0), m);
        compareDist(d, lampLight, mat, m);
    }
    
    // lamp post
    {
        Material lampMat = defaultMaterial();
        float lamp = sdLamp(pt, lampMat);
        compareDist(d, lamp, mat, lampMat);
    }
    
    // temp
    {
        // lights
        light1.y = 2.0*sin(iTime);
        Material ligMat = defaultMaterial();
        ligMat.clr = vec3(1, 2, 1);
        ligMat.isLightObj = true;
        compareDist(d, length(pt - light1) - 0.2, mat, ligMat);
    }
        
    return d;

}

/*******************************************************/

vec3 calcNormal(in vec3 pt) {
    Material m;
    vec2 h = vec2(EPSILON, 0.0);
    return normalize(vec3(
        sdf(pt + h.xyy, m) - sdf(pt - h.xyy, m),
        sdf(pt + h.yxy, m) - sdf(pt - h.yxy, m),
        sdf(pt + h.yyx, m) - sdf(pt - h.yyx, m)
    ));
}

/*******************************************************/

float raymarch(in vec3 ro, in vec3 rd, inout Material mat) {
    
    float td = 0.0;
    
    for (int i = 0; i < MAX_STEPS; i++) {
        float d = sdf(ro + td*rd, mat);
        // if distance is really close, break
        if (abs(d) < (0.0001*td)) break;
        td += d;
        // if too far, break
        if (td >= MAX_DIST) {
            td = -1.0;
            mat.id = -1;
            break;
        }
    }
    
    return td;
    
}

float softShadow(in vec3 ro, in vec3 rd, in float k) {
    float res = 1.0; // result
    Material m;
    float td = 0.05; // total distance traveled
    for (int i = 0; i < 200 && td < MAX_DIST; i++) {
        float d = sdf(ro + td*rd, m);
        if (d < 0.001 && !m.isLightObj) {
            // intersection, so return shadow
            return 0.0;
        }
        if(!m.isLightObj) res = min(res, k*d/td);
        td += d;
    }
    // if no intersection -> shadow 0.0 to light 1.0
    return res;
}

float calcOcc(in vec3 pt, in vec3 nor) {

    float occ = 0.0;
    float scl = 1.0;
    Material m;
        
    for (int i = 0; i < 5; i++) {
        float h = 0.01 + 0.11 * 0.25 * float(i);
        float d = sdf(pt + h * nor, m);
        occ += (h-d)*scl;
        scl *= 0.95;
    }
    
    return uclamp(1.0 - 2.0 * occ);
    
}

/*******************************************************/

vec3 calcLighting(in vec3 pt, in vec3 rd, in vec3 nor, in Light light, in Material mat) {

	// diffuse
	float dif = uclamp(dot(nor, light.dir)) * mat.dif;
	
	// shadow
	float shadow = light.isPointLight || mat.isLightObj ? 1.0 : softShadow(pt, light.dir, light.shadowSoftness);
	
	// specular
	vec3 ref = reflect(light.dir, nor);
	float spec = pow(uclamp(dot(rd, ref)), mat.shininess) * mat.spec;

	// return dif * clr * shadow * spec + dif * clr * shadow; 
	return light.brightness * light.clr * shadow * dif * (spec + 1.0);
    
}

vec3 calcClr(in float d, in vec3 ro, in vec3 rd, in vec3 nor, in Material mat) {

    vec3 pt = ro + d * rd;

    // LIGHTS
    // Light createLight(vec3 pt, bool isPointLight, float fadeAdjust, float shadowSoftness, vec3 dirOrPos, vec3 clr

    Light sun = createLight(pt, false, 1.0, 20.0, normalize(vec3(4, 2, 2)), 2.0 * vec3(0.3, 0.2, 0.3));
    vec3 skyClr = vec3(0.6, 0.3, 0.4) * 0.03;

    // sky
    if (d < 0.0) {
        return skyClr;
    }
    
    vec3 clr = mat.clr;
    
    // light objects
    if (mat.isLightObj) {
        return clr;
    }
    
    // LIGHT CALCULATIONS
    
    vec3 light = mat.amb * clr;
    
    light += calcLighting(pt, rd, nor, sun, mat);
    light += vec3(max(0.0, dot(pt, vec3(0, 1, 0)))) * skyClr;
    
    // point lights
    //Light p1 = createLight(pt, true, 0.5, 20.0, light1, 50.0*vec3(1.0, 0.3, 0.1));
    Light p2 = createLight(pt, true, 0.4, 20.0, light2, 50.0*vec3(1.0, 0.3, 0.1));
    //light += calcLighting(pt, rd, nor, p1, mat);
    light += calcLighting(pt, rd, nor, p2, mat);
    
    clr *= light * calcOcc(pt, nor);  
    
    return clr; 

}

/*******************************************************/

vec4 render(in vec3 ro, in vec3 rd) {
    vec3 clr = vec3(0);
    Material m;
    float d = raymarch(ro, rd, m);
    clr = calcClr(d, ro, rd, calcNormal(ro + rd*d), m);
    if (d < 0.0) d = MAX_DIST;
    return vec4( pow(clr, vec3(0.4545)), d );
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
    
    // camera
    vec3 target = vec3(0.0, 0, 0);
    vec3 ro = target + vec3(0, 0, 10.5);
    
    for (int i = 0; i < AA; i++) {
        for (int j = 0; j < AA; j++) {
            // Normalized pixel coordinates
            vec2 f = fragCoord + vec2(float(i), float(j)) / float(AA);
            vec2 uv = (2.0*f - iResolution.xy) / min(iResolution.x, iResolution.y);
            vec3 rd = setCamera(uv, ro, target);
            // calculate color based on distance, etc
            vec4 rendered = render(ro, rd);
            if (i == 0 && j == 0) d = rendered.a;
            clr += rendered.rgb;
        }
    }

    clr /= float(AA * AA);
    
    // Output to screen
    fragColor = vec4(clr, d);

}
