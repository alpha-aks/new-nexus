import { forwardRef, useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface SpaceshipProps {
  turbo?: number
  onBoostComplete?: () => void
}

const Spaceship = forwardRef<THREE.Group, SpaceshipProps>((props, ref) => {
  const { turbo = 0, onBoostComplete } = props
  const groupRef = useRef<THREE.Group>(null)
  const { nodes, materials } = useGLTF('/public/spaceship.glb')
  const clock = useRef(0)

  useEffect(() => {
    if (!groupRef.current) return;

    try {
      // Scale down the model
      groupRef.current.scale.set(0.5, 0.5, 0.5)
      
      // Position the spaceship
      groupRef.current.position.set(0, 0, 0)
      
      // Add debug logging
      console.log('Spaceship model initialized successfully');
    } catch (error) {
      console.error('Error initializing spaceship model:', error);
    }
  }, [])

  useEffect(() => {
    if (!groupRef.current) return;

    try {
      // Load the model
      const { scene } = useGLTF('/public/spaceship.glb');
      
      // Add the model to the scene
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Set initial position
          child.position.set(0, 0, 0);
          
          // Handle materials
          if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.metalness = 0.5;
            child.material.roughness = 0.5;
            child.material.emissiveIntensity = 0.5;
          }
        }
      });
      
      groupRef.current.add(scene);
      
      // Add debug logging
      console.log('Spaceship model loaded successfully');
    } catch (error) {
      console.error('Error loading spaceship model:', error);
    }
  }, [])

  useFrame(({ clock: frameClock }) => {
    clock.current += frameClock.getDelta()

    if (groupRef.current && turbo > 0) {
      // Boost animation
      const progress = Math.min(clock.current / 1.5, 1) // 1.5 seconds duration
      
      // Move up and forward
      groupRef.current.position.y = 20 * progress
      groupRef.current.position.z = -10 * progress
      
      // Rotate
      groupRef.current.rotation.y = Math.PI * progress
      
      // Fade out
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.opacity = 1 - progress
                mat.transparent = true
              }
            })
          } else if (child.material instanceof THREE.MeshStandardMaterial) {
            child.material.opacity = 1 - progress
            child.material.transparent = true
          }
        }
      })
      
      // Complete boost when done
      if (progress >= 1 && onBoostComplete) {
        onBoostComplete()
      }
    }
  })

  return (
    <group ref={ref} name="spaceship">
      {Object.entries(nodes).map(([name, mesh]) => (
        <mesh
          key={name}
          material={materials.spaceship_racer}
          position={mesh.position.toArray()}
          rotation={mesh.rotation.toArray()}
        />
      ))}
    </group>
  )
})

// Pre-load the model
useGLTF.preload('/public/spaceship.glb')

export default Spaceship