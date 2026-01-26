attribute vec3 aPosition;
        attribute vec2 aTexCoord;
        
        uniform mat4 uViewMatrix;
        uniform mat4 uProjectionMatrix;
        
        varying vec2 vTexCoord;
        
        void main() {
            vTexCoord = aTexCoord;
            
            // Create view matrix without translation (keep only rotation)
            mat4 viewNoTranslation = mat4(
                uViewMatrix[0][0], uViewMatrix[0][1], uViewMatrix[0][2], 0.0,
                uViewMatrix[1][0], uViewMatrix[1][1], uViewMatrix[1][2], 0.0,
                uViewMatrix[2][0], uViewMatrix[2][1], uViewMatrix[2][2], 0.0,
                0.0, 0.0, 0.0, 1.0
            );
            
            vec4 pos = uProjectionMatrix * viewNoTranslation * vec4(aPosition, 1.0);
            gl_Position = pos.xyww;  // Set z=w so skybox is always at far plane
        }
