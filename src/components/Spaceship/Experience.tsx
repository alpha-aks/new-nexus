import { Canvas, useThree, useFrame } from "@react-three/fiber";
import {
  Suspense,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  lazy,
} from "react";
import {
  EffectComposer,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";
import LoadingScreen from "../LoadingScreen";

// Lazy load heavy components
const Stars = lazy(() => import("./Stars"));
const Spaceship = lazy(() => import("./Spaceship"));
const MotionBlur = lazy(() => import("./MotionBlur"));

// Types
interface DynamicEnvMapProps {
  children: React.ReactNode;
}

interface CameraRigProps {
  turbo: number;
}

interface MousePlaneProps {
  onMove: (point: THREE.Vector3) => void;
  turbo: number;
}

interface SpaceshipControllerProps {
  mousePoint: THREE.Vector3;
  turbo: number;
  onBoostComplete?: () => void;
}

// Create PMREM Generator for dynamic environment mapping
const DynamicEnvMap: React.FC<DynamicEnvMapProps> = ({ children }) => {
  const { gl, scene } = useThree();
  const pmrem = useMemo(() => new THREE.PMREMGenerator(gl), [gl]);
  const previousEnvMap = useRef<THREE.WebGLRenderTarget | null>(null);

  useFrame(() => {
    try {
      // Hide spaceship temporarily
      scene.traverse((obj) => {
        if (obj.name === "spaceship") obj.visible = false;
      });

      // Clear background
      const originalBackground = scene.background;
      scene.background = null;

      // Generate environment map
      const envMap = pmrem.fromScene(scene);

      // Restore scene
      scene.background = originalBackground;
      scene.traverse((obj) => {
        if (obj.name === "spaceship") {
          obj.visible = true;
          // Apply environment map to spaceship materials
          obj.traverse((child) => {
            if (
              child instanceof THREE.Mesh &&
              child.material instanceof THREE.MeshStandardMaterial
            ) {
              child.material.envMap = envMap.texture;
              child.material.envMapIntensity = 100;
              child.material.needsUpdate = true;
            }
          });
        }
      });

      // Dispose of previous envMap
      if (previousEnvMap.current) {
        previousEnvMap.current.dispose();
      }
      previousEnvMap.current = envMap;
    } catch (error) {
      console.error('Error generating environment map:', error);
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (previousEnvMap.current) {
        previousEnvMap.current.dispose();
      }
      pmrem.dispose();
    };
  }, [pmrem, previousEnvMap]);

  return <>{children}</>;
};

// Camera Rig
const CameraRig: React.FC<CameraRigProps> = ({ turbo }) => {
  const { camera } = useThree();
  const perspCamera = camera as THREE.PerspectiveCamera;

  // Base camera position for non-turbo view
  const basePosition = new THREE.Vector3(-4, 4, 6);
  const baseLookAt = new THREE.Vector3(0, 0, 0);

  // Turbo camera position
  const turboPosition = new THREE.Vector3(5, 1, 1);
  const turboLookAt = new THREE.Vector3(-5, 0, 0);

  useFrame(() => {
    try {
      const targetPos = turbo > 0 ? turboPosition : basePosition;
      const targetLook = turbo > 0 ? turboLookAt : baseLookAt;

      // Smoothly interpolate position
      camera.position.lerp(targetPos, 0.05);

      // Update camera look-at
      camera.lookAt(targetLook);

      // Update FOV
      const targetFOV = 40 + turbo * 15;
      perspCamera.fov = THREE.MathUtils.lerp(perspCamera.fov, targetFOV, 0.02);
      perspCamera.updateProjectionMatrix();
    } catch (error) {
      console.error('Error updating camera:', error);
    }
  });

  // Set initial position and look-at
  useEffect(() => {
    try {
      camera.position.copy(basePosition);
      camera.lookAt(baseLookAt);
      perspCamera.fov = 40;
      perspCamera.updateProjectionMatrix();
    } catch (error) {
      console.error('Error setting initial camera:', error);
    }
  }, [camera]);

  return null;
};

// MousePlane component for mouse tracking
const MousePlane: React.FC<MousePlaneProps> = ({ onMove, turbo }) => {
  const intersectionPoint = new THREE.Vector3();

  const handlePointerMove = (event: { point: THREE.Vector3 }) => {
    if (turbo > 0) return; // Disable steering during turbo
    intersectionPoint.set(-3, event.point.y, event.point.z);
    onMove(intersectionPoint);
  };

  return (
    <mesh
      renderOrder={2}
      visible={false}
      onPointerMove={handlePointerMove}
      rotation={[-Math.PI * 0.1, 0, 0]}
    >
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial transparent opacity={0.25} color={[1, 0, 1]} />
    </mesh>
  );
};

// SpaceshipController component
const SpaceshipController: React.FC<SpaceshipControllerProps> = ({
  mousePoint,
  turbo,
  onBoostComplete,
}) => {
  const spaceshipRef = useRef<THREE.Group>(null);
  const translateY = useRef(0);
  const translateAcceleration = useRef(0);
  const angleZ = useRef(0);
  const angleAcceleration = useRef(0);
  const pitchAngle = useRef(0);
  const pitchAcceleration = useRef(0);

  useFrame(() => {
    if (!spaceshipRef.current) return;

    try {
      if (turbo > 0) {
        // During turbo, gradually return to center
        translateAcceleration.current += (0 - translateY.current) * 0.01;
        angleAcceleration.current += (0 - angleZ.current) * 0.01;
        pitchAcceleration.current += (0 - pitchAngle.current) * 0.01;
      } else {
        // Normal steering with bounds
        const boundedY = Math.max(-3, Math.min(1, mousePoint.y)); // Limit vertical range to ±3 units
        translateAcceleration.current += (boundedY - translateY.current) * 0.002;

        // Calculate target pitch based on mouse Z position
        const targetPitch = mousePoint.z * 0.5;
        pitchAcceleration.current += (targetPitch - pitchAngle.current) * 0.01;
      }

      // Apply acceleration damping
      translateAcceleration.current *= 0.95;
      translateY.current += translateAcceleration.current;

      pitchAcceleration.current *= 0.85;
      pitchAngle.current += pitchAcceleration.current;

      // Calculate rotation based on mouse position with bounds
      const dir = mousePoint
        .clone()
        .sub(new THREE.Vector3(0, translateY.current, 0))
        .normalize();

      // Calculate yaw (left/right tilt)
      const dirCos = dir.dot(new THREE.Vector3(0, 1, 0));
      const angle = Math.acos(dirCos) - Math.PI / 2;

      // Limit rotation angles
      const boundedAngle = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, angle));
      const boundedPitch = Math.max(
        -Math.PI / 6,
        Math.min(Math.PI / 6, pitchAngle.current)
      );

      // Update rotation with smooth acceleration
      if (!turbo) {
        angleAcceleration.current += (boundedAngle - angleZ.current) * 0.01;
      }
      angleAcceleration.current *= 0.75;
      angleZ.current += angleAcceleration.current;

      // Apply transformations with proper Euler angles
      spaceshipRef.current.position.setY(translateY.current);
      spaceshipRef.current.rotation.set(
        boundedPitch,
        -Math.PI / 2,
        angleZ.current,
        "YZX"
      );
    } catch (error) {
      console.error('Error controlling spaceship:', error);
    }
  });

  useEffect(() => {
    if (turbo > 0 && onBoostComplete) {
      const timeoutId = setTimeout(onBoostComplete, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [turbo, onBoostComplete]);

  return <Spaceship turbo={turbo} ref={spaceshipRef} />;
};

// Main Experience component
const Experience = () => {
  const [turbo, setTurbo] = useState(0);
  const [mousePoint, setMousePoint] = useState(new THREE.Vector3(0, 0, 0));
  const [isMobile, setIsMobile] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);

  useEffect(() => {
    setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.code === "KeyW") {
      setTurbo(1);
      setIsBoosting(true);
    }
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === "KeyW") {
      setTurbo(0);
      setIsBoosting(false);
    }
  }, []);

  useEffect(() => {
    if (!isMobile) {
      window.addEventListener("keydown", handleKeyDown);
      window.addEventListener("keyup", handleKeyUp);
      return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
      };
    }
  }, [handleKeyDown, handleKeyUp, isMobile]);

  const handleBoostComplete = useCallback(() => {
    // Trigger page transition when boost is complete
    if (isBoosting) {
      // Add your page transition logic here
      // For example, navigate to the next page
      // window.location.href = '/next-page'
      console.log('Boost complete!');
    }
  }, [isBoosting]);

  return (
    <div className="h-screen">
      <LoadingScreen />
      
      {/* Controls Overlay */}
      <div className="absolute inset-x-0 bottom-12 flex justify-center pointer-events-none z-10">
        {isMobile ? (
          <div className="pointer-events-auto">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={turbo === 1}
                onChange={(e) => setTurbo(e.target.checked ? 1 : 0)}
              />
              <div className="w-20 h-11 bg-white/10 backdrop-blur-sm peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-white/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-10 after:w-10 after:transition-all peer-checked:bg-white/30"></div>
              <span className="ml-3 text-sm text-white/70">
                {turbo === 1 ? 'Boosting' : 'Boost'}
              </span>
            </label>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2 text-white/50 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full">
            <kbd className="px-2 py-1 text-sm bg-white/10 rounded">W</kbd>
            <span className="text-sm md:text-base">To Boost Your buisness</span>
          </div>
        )}
      </div>

      <Canvas
        dpr={[1, 1.5]}
        performance={{ min: 0.5 }}
        shadows
        camera={{ fov: 40, near: 0.1, far: 200 }}
        gl={{
          antialias: true,
          powerPreference: "high-performance",
        }}
        style={{
          background: "#000000",
        }}
      >
        <CameraRig turbo={turbo} />

        <Suspense fallback={null}>
          <DynamicEnvMap>
            {/* Mouse tracking plane */}
            <MousePlane onMove={setMousePoint} turbo={turbo} />

            {/* Enhanced Lighting Setup */}
            <ambientLight intensity={0.3} />

            {/* Main directional light */}
            <directionalLight
              position={[1, 2, 3]}
              intensity={0.5}
              castShadow
              shadow-mapSize={[1024, 1024]}
              shadow-bias={-0.0001}
            />

            {/* Stars Background */}
            <Stars turbo={turbo} />

            {/* Spaceship with movement control */}
            <SpaceshipController mousePoint={mousePoint} turbo={turbo} onBoostComplete={handleBoostComplete} />

            {/* Post Processing */}
            <EffectComposer multisampling={4}>
              {/* Motion Blur */}
              <MotionBlur turbo={turbo} />

              {/* Chromatic Aberration */}
              <ChromaticAberration
                blendFunction={BlendFunction.NORMAL}
                offset={[0.002 * turbo, 0.002 * turbo]}
              />
            </EffectComposer>
          </DynamicEnvMap>
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Experience;
