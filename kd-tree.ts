import Coor, { getRandomNumber } from "./GrowthMap"

export type KPoint = number[]

export type KDTreeInput<T> = { point: KPoint, value: T }

interface Node<T> {
  parent?: Node<T>
  right?: Node<T>
  left?: Node<T>
  point: KPoint

  value: T
}

export class KDTree<T> {
  k: number
  root: Node<T>

  constructor(points: KDTreeInput<T>[], k: number = 2) {
    this.k = k
    this.root = this.build(points)!
  }

  rebalance() {
    this.root = this.build(this.all())!
  }

  pointsAreSame(a: KPoint, b: KPoint) : boolean {
    for (const [index, value] of a.entries()) {
      if (value != b[index]) return false
    }
    return true
  }

  scan(point: KPoint, distance: number) : Node<T>[] {
    return this.range(
      point.map(val => val - distance),
      point.map(val => val + distance),
    )
  }

  find(atPoint: KPoint, branch: Node<T> = this.root, depth: number = 0) : Node<T> | undefined {
    const axis = depth % this.k

    if (!branch) {
      throw new Error(`No branch, trying to find ${atPoint}`)
    }

    if (this.pointsAreSame(atPoint, branch.point)) return branch
    
    if (atPoint[axis] < branch.point[axis]) {
      if (!branch.left) return
      return this.find(atPoint, branch.left, depth + 1)
    } else if (atPoint[axis] >= branch.point[axis]) {
      if (!branch.right) return
      return this.find(atPoint, branch.right, depth + 1)
    }
  }

  all(branch = this.root, order: number = -1) : KDTreeInput<T>[] {
    let points: KDTreeInput<T>[] = [
      {
        point: branch.point,
        value: branch.value
      }
    ]
    if (order == -1) {
      if (branch.left) {
        points = [...this.all(branch.left, order), ...points]
      }
      if (branch.right) {
        points = [...points, ...this.all(branch.right, order)]
      }
    } else if (order == 1) {
      if (branch.right) {
        points = [...this.all(branch.right, order), ...points]
      }
      if (branch.left) {
        points = [...points, ...this.all(branch.left, order)]
      }
    }

    return points
  }

  add(item: KDTreeInput<T>, branch = this.root, depth = 0) { // this should maintain balance, with a cost towards efficency
    // find where to insert
    // when item is between the current branch and a child 
    // rebuild the current branch with the item added

    const axis = this.axis(depth)
    const nextAxis = (depth + 1) % this.k

    if (!this.root) {
      this.root = {
        point: item.point,
        value: item.value,
      }
      return
    }

    if (item.point[axis] < branch.point[axis]) {
      if (!branch.left) {
        branch.left = {
          parent: branch,
          ...item
        }
      } else if (item.point[nextAxis] >= branch.left.point[nextAxis]) {
        if (!branch.parent) {
          this.root = this.build([item, ...this.all(branch)], branch.parent, depth)!
        } else {
          branch.parent.left = this.build([item, ...this.all(branch)], branch.parent, depth)
        }
      } else {
        this.add(item, branch.left, depth + 1)
      }
    } else if (item.point[axis] >= branch.point[axis]) {
      if (!branch.right) {
        branch.right = {
          parent: branch,
          ...item
        }
      } else if (item.point[nextAxis] < branch.right.point[nextAxis]) {
        if (!branch.parent) {
          this.root = this.build([item, ...this.all(branch)], branch.parent, depth)!
        } else {
          branch.parent.right = this.build([item, ...this.all(branch)], branch.parent, depth)
        }
      } else {
        this.add(item, branch.right, depth + 1)
      }
    }
  }

  // delete(item: KDTreeInput<T>, branch = this.root, depth = 0) {
  //   const axis = this.axis(depth)
  //   const nextAxis = (depth + 1) % this.k

    
  // }

  axis(atDepth: number) : number {
    return atDepth % this.k
  }

  min(branch = this.root) : Node<T> {
    if (branch.left) {
      return this.min(branch.left)
    }
    return branch
  }

  max(branch = this.root) : Node<T> {
    if (branch.right) {
      return this.max(branch.right)
    }
    return branch
  }

  range(min: KPoint, max: KPoint, branch = this.root, depth = 0) : Node<T>[] {
    const axis = depth % this.k

    let points: Node<T>[] = []
    const greaterThanOrEqualToMin = this.greaterThanOrEqual(branch.point, min)
    const lessThanOrEqualToMax = this.lessThanOrEqual(branch.point, max)

    if (greaterThanOrEqualToMin && lessThanOrEqualToMax) {
      points.push(branch)
    }
      
    if (branch.point[axis] > max[axis] && branch.left) {
      return this.range(min, max, branch.left, depth + 1)
    } else if (branch.point[axis] < min[axis] && branch.right) {
      return this.range(min, max, branch.right, depth + 1)
    } else {
      if (branch.right) {
        points = [...points, ...this.range(min, max, branch.right, depth + 1)]
      }
      if (branch.left) {
        points = [...points, ...this.range(min, max, branch.left, depth + 1)]
      }
    }
    
    return points
  }

  greaterThanOrEqual(first: KPoint, second: KPoint) : boolean {
    for (const [index, value] of first.entries()) {
      if (value < second[index]) return false
    }
    return true
  }


  lessThanOrEqual(first: KPoint, second: KPoint) : boolean {
    for (const [index, value] of first.entries()) {
      if (value > second[index]) return false
    }
    return true
  }

  build(points: KDTreeInput<T>[], node: Node<T> | undefined = undefined, depth: number = 0) : Node<T> | undefined {
    const n = points.length - 1
    
    
    if (n < 0) return

    const axis = depth % this.k

    let sortedPoints = points.sort((a, b) => {
      const aVal = a.point[axis]
      const bVal = b.point[axis]

      if (aVal < bVal) return -1
      if (aVal == bVal) return 0
      return 1
    })

    const point = sortedPoints[Math.floor(n / 2)]

    sortedPoints = sortedPoints.filter(pointToFilter => !this.pointsAreSame(point.point, pointToFilter.point))

    const left = sortedPoints.filter(pointToFilter => pointToFilter.point[axis] < point.point[axis])
    const right = sortedPoints.filter(pointToFilter => pointToFilter.point[axis] >= point.point[axis])

    const newNode: Node<T> = {
      parent: node,
      point: point.point,
      value: point.value
    }

    newNode.left = this.build(left, newNode, depth + 1)
    newNode.right = this.build(right, newNode, depth + 1)

    return newNode
  }

  log(branch: Node<T> = this.root, highlight: KPoint | undefined = undefined, depth: number = 0, direction: string = 'X') {
    if (highlight && this.pointsAreSame(highlight, branch.point)) {
      console.log(' '.repeat(depth) + '' + `${depth}-${direction}-${depth % this.k} = ` + branch.value + ' <---');
    } else {
      console.log('' + ' '.repeat(depth) + '' + `${depth}-${direction}-${depth % this.k} = ` + branch.value);
    }
    
    if (branch.right) {this.log(branch.right, highlight, depth + 1, 'R')}
    if (branch.left) {this.log(branch.left, highlight, depth + 1, 'L')}
    
    
  }

  report() {
    console.log(`Size: ${this.all().length} nodes`)
  }
}

// export function runTest() {

//   console.log("KD Tree Test Start");

//   let points = (new Coor(0, 0)).scan(0)
//   .map(point => {
//     return {
//       point: [point.x, point.y],
//       value: `{${point.x} | ${point.y}}`
//     }
//   })

//   var tree = new KDTree(points, 2)
  
//   //tree.log()
//   tree.report()

//   var at = [0, 0]

//   var foundValue = tree.find(at)
  
//   console.log(`Found ${foundValue?.value} at ${at}`);

  

//   for (let i = 0; i < 500; i++) {
//     const x = getRandomNumber(0, 100)
//     const y = getRandomNumber(0, 100)
//     var newItem = {
//       point: [x, y],
//       value: `{${x} | ${y}}`
//     }
  
//     foundValue = tree.find(newItem.point)
    
//     console.log(`Found ${foundValue?.value} at ${newItem.point}`);
  
//     tree.add(newItem)
  
//     foundValue = tree.find(newItem.point)
  
//     console.log(`Found ${foundValue?.value} at ${newItem.point}`);
//   }

  

//   tree.log()

//   tree.report()


//   tree.rebalance()

//   tree.log()
// }
