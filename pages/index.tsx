import { useEffect } from "react"
import * as THREE from "three"
import { MapControls } from "three/examples/jsm/controls/OrbitControls"
import { Water } from "three/examples/jsm/objects/Water.js"
import { Sky } from "three/examples/jsm/objects/Sky.js"
import Coor, { GrowthMap, GrowthPointData, LandType, getRandomNumber, ring, getAdjacentCoors, getRandomBool } from "../GrowthMap"
import { KDTree, KDTreeInput } from "../kd-tree"

let water;

export default function Home() {

  useEffect(() => {
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    )
    
    const renderer = new THREE.WebGLRenderer()
    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    )

    //renderer.shadowMap.enabled = true

    const growthMap = new GrowthMap()

    async function drawMap() { return
      growthMap.growToSize(15000, (point: GrowthPointData) => {
        if (point.landType == LandType.scaffold) return
        const geometry = new THREE.BoxGeometry()
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        
        const cube = new THREE.Mesh(geometry, material)

        cube.position.x = point.coor.x
        cube.position.z = point.coor.y

        scene.add(cube)
      })
    }

    const sun = new THREE.Vector3();

    const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 );
    
		water = new Water(
      waterGeometry,
      {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load( 'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/waternormals.jpg', function ( texture ) {

          texture.wrapS = texture.wrapT = THREE.RepeatWrapping;

        } ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: .1,
        fog: scene.fog !== undefined
      }
    );

  water.rotation.x = - Math.PI / 2;

  scene.add( water );

  

  const sky = new Sky();
  sky.scale.setScalar( 10000 );
  scene.add( sky );

  const skyUniforms = sky.material.uniforms;

  skyUniforms[ 'turbidity' ].value = 10;
  skyUniforms[ 'rayleigh' ].value = 2;
  skyUniforms[ 'mieCoefficient' ].value = 0.005;
  skyUniforms[ 'mieDirectionalG' ].value = 0.8;

  const parameters = {
    elevation: 2,
    azimuth: 180
  };

  

  const pmremGenerator = new THREE.PMREMGenerator( renderer );

  function updateSun() {

    const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
    const theta = THREE.MathUtils.degToRad( parameters.azimuth );

    

    sun.setFromSphericalCoords( 1, phi, theta );

    sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
    //@ts-ignore
    water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

    //@ts-ignore
    scene.environment = pmremGenerator.fromScene( sky ).texture;

  }

  updateSun();


  // light
    
  const light1 = new THREE.DirectionalLight(0xffffff, 1)
  light1.position.set(200, 200, 200)

  scene.add(light1)

  const light2 = new THREE.DirectionalLight(0xffffff, 1)
  light2.position.set(-200, 150, -200)

  scene.add(light2)

  const ambiantLight = new THREE.HemisphereLight()

  ambiantLight.intensity = .25

  //scene.add(ambiantLight)




    camera.position.y = 50

    const controls = new MapControls(camera, renderer.domElement)

    controls.enableDamping = true; // an animation loop is required when either damping or auto-rotation are enabled
    controls.dampingFactor = 0.25;

    controls.screenSpacePanning = false;


    controls.maxPolarAngle = Math.PI / 2;

    controls.update()


    let start = false

    window.addEventListener('keyup', (e) => {
      
      switch (e.keyCode) {
        case 13: // enter
          start = true
          break
      }
      
      
    })



    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()

      renderer.setSize(window.innerWidth, window.innerHeight)
    })


    let points: TileData[] = []

    let tree: KDTree<TileData>

    let scaffold = 0

    let landmasses: Landmass[] = []

    let landPoints = 0

    function animate() {
      requestAnimationFrame(animate)

      if (!start) {
        const time = performance.now() * 0.001;


				water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
        controls.maxPolarAngle = Math.PI * 0.495;
      controls.update()

      renderer.render(scene, camera)
      return
      }

      if (start && landPoints < 10000) {
        if (scaffold > 0) {
          growthMap.grow(LandType.scaffold, .5)
          scaffold--
        } else {
          if (getRandomBool(.01)) {
            scaffold = getRandomNumber(1, 40)
          }

          growthMap.grow(LandType.land, .5, (point: GrowthPointData) => {
            const height = 1
            if (point.landType == LandType.scaffold) return
            const geometry = new THREE.BoxGeometry(1, height, 1)
            const material = new THREE.MeshPhongMaterial({ color: 0x00ff00 })

            const cube = new THREE.Mesh(geometry, material)
    
            cube.castShadow = true
            cube.receiveShadow = true
  
            cube.position.x = point.coor.x
            cube.position.z = point.coor.y
            cube.position.y = height / 2
  
            const edges = new THREE.EdgesGeometry( cube.geometry );
            const line = new THREE.LineSegments( edges, new THREE.LineBasicMaterial( { color: 0x000000 } ) );
            line.position.x = point.coor.x
            line.position.z = point.coor.y
            line.position.y = height / 2
  
  
            //scene.add( line );
    
            scene.add(cube)
  
            points.push({
              rendering: {
                cube,
                lines: line
              },
              mapData: {
                growthPointData: point
              },
              x: point.coor.x,
              y: point.coor.y,
              landmass: undefined
            })

            landPoints++
          })
        }
        
      } else if (!tree) {
        tree = new KDTree(
          points.map(
            i => {
              return {
                point: [i.x, i.y],
                value: i
              }
            }
          )
        )
        
      } else if (landmasses.length == 0) {
        landmasses = landmassesFind(tree)

        landmasses.forEach(landmass => {
          const color = new THREE.Color('#'+(Math.random() * 0xFFFFFF << 0).toString(16).padStart(6, '0'))

          landmass.points.all().forEach(i => {
            i.value.rendering.cube.material.color = color
          })

          landmass.getCostalPoints().all().forEach(i => {
            const height = .5
            i.value.rendering.cube.geometry = new THREE.BoxGeometry(1, height, 1)
            i.value.rendering.cube.position.y -= height
            i.value.rendering.lines.geometry =  new THREE.EdgesGeometry( i.value.rendering.cube.geometry );
            i.value.rendering.lines.position.y -= height
          })
        })

        
      }

      const time = performance.now() * 0.001;


				water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
        controls.maxPolarAngle = Math.PI * 0.495;
      controls.update()

      renderer.render(scene, camera)
    }
    animate()

    document.body.appendChild(renderer.domElement)

  })

  

  return (
    <div>
    </div>
  )
}

interface TileData {
  rendering: {
    cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshBasicMaterial>
    lines: THREE.LineSegments<THREE.EdgesGeometry, THREE.LineBasicMaterial>
  }
  x: number,
  y: number,
  mapData: {
    growthPointData: GrowthPointData
  }
  landmass: Landmass | undefined
}



const landmassesFind = (treeMap: KDTree<TileData>) => {

  let landmasses: Landmass[] = []

  console.log({landmasses});
  


  treeMap.all().forEach(item => {
    console.log({
      item
    });
    
    if (landmasses.filter(i => i.points.find(item.point)).length > 0) {
      console.log("point already assigned to a landmass");
      
      return
    }

    const newLandmass = new Landmass(
      `Landmass ${landmasses.length}`,
      []
    )

    console.log({
      newLandmass
    });
    

    const tempLandmassPoints = new Set<TileData>()

    let pointsToCheck: Set<TileData> = new Set<TileData>()
    let nextPointsToCheck: Set<TileData> = new Set<TileData>()

    pointsToCheck.add(item.value)

    while (pointsToCheck.size > 0) {
      console.log({
        tempLandmassPoints,
        pointsToCheck,
        nextPointsToCheck
      });
      
      pointsToCheck.forEach(point => {
        point.landmass = newLandmass
        tempLandmassPoints.add(point)

        ring(1, point.mapData.growthPointData.coor)
        .map(i => treeMap.find([i.x, i.y]))
        .forEach(i => i && !tempLandmassPoints.has(i.value) && nextPointsToCheck.add(i.value))
      })
      pointsToCheck = new Set<TileData>([...nextPointsToCheck])
      nextPointsToCheck.clear()
    }

    newLandmass.points = new KDTree<TileData>([...tempLandmassPoints.values()].map(i => ({
      point: [i.x, i.y],
      value: i
    })))

    

    landmasses.push(newLandmass)
  })

  console.log({
    landmasses
  });
  
  return landmasses

}

class Landmass {
  
  points: KDTree<TileData>

  name: string

  constructor(name: string, points: TileData[]) {
    this.points = new KDTree(points.map(point => ({ point: [point.x, point.y], value: point})))
    this.name = name
  }

  private costalPoints: KDTree<TileData> | undefined

  clearCostalPoints() {
    this.costalPoints = undefined
  }

  getCostalPoints() : KDTree<TileData> {
    if (!this.costalPoints) {
      let newCostalPoints: KDTreeInput<TileData>[] = []
      this.points.all().forEach(point => {
        if (getAdjacentCoors(point.value.mapData.growthPointData.coor).filter(adjacentPoint => !this.points.find([adjacentPoint.x, adjacentPoint.y])).length > 0) {
          newCostalPoints.push(point)
        }
      })
      this.costalPoints = new KDTree<TileData>(newCostalPoints)
    }
    return this.costalPoints
  }

  private costalRings: {
    beach: CostalRing,
    lakes: CostalRing[]
  } | undefined

  clearCostalRings() {
    this.costalRings = undefined
  }

  getCostalRings() {
    if (!this.costalRings) {
      let rings: CostalRing[] = []

      this.getCostalPoints().all().forEach(point => {
        if (!!rings.filter(ring => ring.points.find(point.point))) return

        const newRing = new Set<TileData>()

        let currentSet = new Set<TileData>()
        let nextSet = new Set<TileData>()

        currentSet.add(point.value)

        while (currentSet.size > 0) {
          currentSet.forEach(step => {

          getAdjacentCoors(step.mapData.growthPointData.coor)
          .map(i => this.getCostalPoints().find([i.x, i.y]))
          .forEach(i => i && !newRing.has(i.value) && nextSet.add(i.value))
          })

          currentSet = new Set<TileData>([...nextSet])
          nextSet.clear()
        }

        rings.push({
          points: new KDTree<TileData>([...newRing].map(i => ({ point: [i.x, i.y], value: i }))),
          water: undefined
        })
      })


      //this.costalRings = 
    }
    return this.costalRings
  }

}

interface BodyOfWater {
  points: KDTree<TileData>
}

interface CostalRing {
  points: KDTree<TileData>
  water: BodyOfWater | undefined
}

// function flood<T>(point: Coor, pointExists: (point: Coor) => boolean, search: (point: Coor) => Coor[] ) : KDTreeInput<T>[] {
//   const mainSet = new Set<Coor>()

//   const currentSet = new Set<Coor>()
//   const nextSet = new Set<Coor>()

//   currentSet.add(point)

//   while (currentSet.size > 0) {
//     currentSet.forEach(step => {

//       getAdjacentCoors(point.value.mapData.growthPointData.coor)
//       .map(i => this.getCostalPoints().find([i.x, i.y]))
//       .forEach(i => i && !newRing.has(i.value) && nextSet.add(i.value))
//       })

//       currentSet = new Set<TileData>([...nextSet])
//       nextSet.clear()
//   }


//   return [...mainSet]
// }
