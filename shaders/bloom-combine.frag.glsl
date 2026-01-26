precision mediump float;
        
        uniform sampler2D uScene;
        uniform sampler2D uBloom;
        uniform float uBloomIntensity;
        
        varying vec2 vTexCoord;
        
        void main() {
            vec4 sceneColor = texture2D(uScene, vTexCoord);
            vec4 bloomColor = texture2D(uBloom, vTexCoord);
            
            vec3 result = sceneColor.rgb + bloomColor.rgb * uBloomIntensity;
            result = result / (result + vec3(1.0));
            
                gl_FragColor = vec4(result, 1.0);
            }
