
export default class Coor {
  x: number
  y: number

  constructor(x: number, y: number) {
      this.x = x
      this.y = y
  }

  sameAs(coor: Coor) : boolean {
      if (this.x == coor.x && this.y == coor.y) {
          return true
      }
      return false
  }
}

export enum LandType {
    land, scaffold, coast, mountain
}
enum Direction {
    north, south, east, west
}

export function getOppositeDirection(direction: Direction) : Direction {
    switch (direction) {
        case Direction.north: {
            return Direction.south
        }
        case Direction.south: {
            return Direction.north
        }
        case Direction.east: {
            return Direction.west
        }
        case Direction.west: {
            return Direction.east
        }
    }
}

export function getAdjacentCoors(coor: Coor) : Array<Coor> {
    return [
        new Coor(coor.x + 1, coor.y),
        new Coor(coor.x - 1, coor.y),
        new Coor(coor.x, coor.y + 1),
        new Coor(coor.x, coor.y - 1)
    ]
}

export function shuffle<T>(array: Array<T>) : Array<T> {
    var oldArray = [...array]

    var newArray: Array<T> = []

    while(oldArray.length > 0) {
        if (oldArray.length == 1) {
            newArray.push(oldArray[0])
            oldArray.pop()
        } else {
            const nextValue = getRandomNumber(0, oldArray.length - 1)
            newArray.push(oldArray[nextValue])
            oldArray.splice(nextValue, 1)
        }
        
    }
    return newArray
}

export function getDisplacedCoor(coor: Coor, direction: Direction) : Coor {
    switch (direction) {
        case Direction.north: {
            return new Coor(coor.x, coor.y - 1)
        }
        case Direction.south: {
            return new Coor(coor.x, coor.y + 1)
        }
        case Direction.east: {
            return new Coor(coor.x + 1, coor.y)
        }
        case Direction.west: {
            return new Coor(coor.x - 1, coor.y)
        } 
    }
}

export function getDirectionsOtherThan(direction: Direction) : Array<Direction> {
    return [
        Direction.north,
        Direction.south,
        Direction.east,
        Direction.west
    ].filter( val => val != direction )
}

export function getRandomNumber(min: number, max: number) : number { // [min, max]
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min
}

export function getRandomBool(chance: number = 0.5) : boolean {
    return getRandomNumber(0, 100) / 100 <= chance ? true : false
}

export function getRandomItem<T>(array: Array<T>) : T {
    return array[getRandomNumber(0, array.length - 1)]
}

export function ring(distance: number, point: Coor) : Array<Coor> {
    const xRange = range(point.x - distance, point.x + distance)
    const yRange = range(point.y - distance, point.y + distance)
    return [
        ...xRange.map( x => new Coor(x, point.y - 1)),
        ...xRange.map( x => new Coor(x, point.y + 1)),
        ...yRange.map( y => new Coor(point.x - 1, y)),
        ...yRange.map( y => new Coor(point.x + 1, y))
    ] 
}

export function filterCoors(grid: {
        xMin: number,
        xMax: number, 
        yMin: number, 
        yMax: number
    }, coors: Array<Coor>) : Array<Coor> {
    return coors.filter( coor => coor.x >= grid.xMin && 
        coor.x <= grid.xMax &&
        coor.y >= grid.yMin &&
        coor.y <= grid.yMax )
}

export function scan(distance: number, point: Coor) : Array<Coor> {
    const xRange = range(point.x - distance, point.x + distance)
    const yRange = range(point.y - distance, point.y + distance)
    return xRange.map( (x, i) => new Coor(x, yRange[i]) )
}

export function range(start: number, end: number) : Array<number> {
    let numbers: number[] = []
    for (let i = start; i <= end; i++) {
        numbers.push(i)
    }
    return numbers
}

export class GrowthPointData {
    coor: Coor
    landType: LandType

    constructor(coor: Coor, landType: LandType) {
        this.coor = coor
        this.landType = landType
    }
}

export class GrowthMap {
    points: Array<GrowthPointData> = []

    growthPoints: Array<Coor> = [new Coor(0, 0)]

    removePoint(coor: Coor) {
        this.points = this.points.filter( point =>  point.coor.sameAs(coor))
    }

    addPoint(point: GrowthPointData) {
        this.points.push(point)
    }

    checkForPoint(coor: Coor) : GrowthPointData {
        return this.points.filter( point => point.coor.sameAs(coor) )[0] || null
    }

    grow(type: LandType, chance: number, callback?: (point: GrowthPointData) => void) : Array<Coor> {
        var newGrowth: Array<Coor> = []

        this.growthPoints.forEach( point => {
            const adjacentPoints = getAdjacentCoors(point)
            shuffle(adjacentPoints).forEach( adjacentPoint => {
                if (!this.checkForPoint(adjacentPoint)) {
                    if (newGrowth.length == 0 || getRandomBool(chance)) {
                        const point = new GrowthPointData(adjacentPoint, type)
                        this.addPoint(point)
                        if (callback) callback(point)
                        newGrowth.push(adjacentPoint)
                    }
                }
            } )
        })

        this.growthPoints = newGrowth

        return newGrowth
    }

    growToSize(size: number, callback?: (point: GrowthPointData) => void) {
        var count = 0
        while (count < size) {
            
            for ( let i = getRandomNumber(25, 100); i--; ) {
                if (count >= size) {
                    break
                }
                const growth = this.grow(LandType.land, 0.5, callback).length
                if (growth == 0) {
                    return
                }
                count += growth
            }

            for ( let i = getRandomNumber(25, 100); i--; ) {
                if (count >= size) {
                    break
                }
                this.grow(LandType.scaffold, 0.5)
            }
        }
    }
}