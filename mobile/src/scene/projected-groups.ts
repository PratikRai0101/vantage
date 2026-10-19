import type { Point3 } from './math';

export type ProjectedCar = { number: number; position: Point3; heading: number };
export type ProjectedGroup = { representative: number; members: number[] };

// Display footprint of the exaggerated miniature, not a measured collision box.
const HALF_LENGTH=1.23, HALF_WIDTH=.61;
export function footprintsOverlap(a: ProjectedCar,b: ProjectedCar,padding=0): boolean {
  if(Math.abs(a.position[1]-b.position[1])>.75)return false; // grade-separated bridge
  const axes=(h:number)=>[[Math.cos(h),-Math.sin(h)],[Math.sin(h),Math.cos(h)]];
  const aa=axes(a.heading),bb=axes(b.heading),delta=[b.position[0]-a.position[0],b.position[2]-a.position[2]];
  for(const axis of [...aa,...bb]) {
    const project=(basis:number[][])=>(HALF_LENGTH+padding)*Math.abs(axis[0]*basis[0][0]+axis[1]*basis[0][1])+(HALF_WIDTH+padding)*Math.abs(axis[0]*basis[1][0]+axis[1]*basis[1][1]);
    if(Math.abs(delta[0]*axis[0]+delta[1]*axis[1])>=project(aa)+project(bb))return false;
  }
  return true;
}

/** Group ambiguous coincident projections instead of inventing racing lanes.
 * Previous membership provides a small display-only release margin, not physics.
 * The representative stays at its OWN recorded projection, never a fake centroid.
 */
export function nextGroupDriver(group:ProjectedGroup,selected:number):number {
  const index=group.members.indexOf(selected);
  return index<0?group.representative:group.members[(index+1)%group.members.length];
}
export function groupProjectedCars(cars:readonly ProjectedCar[],selected:number,partner?:number,previous:readonly ProjectedGroup[]=[]):ProjectedGroup[] {
  const parent=cars.map((_,i)=>i);
  const root=(n:number):number=>{while(parent[n]!==n){parent[n]=parent[parent[n]];n=parent[n];}return n;};
  const old=new Map<number,number>();previous.forEach((g,i)=>g.members.forEach(n=>old.set(n,i)));
  for(let i=0;i<cars.length;i++)for(let j=0;j<i;j++) {
    const held=old.has(cars[i].number)&&old.get(cars[i].number)===old.get(cars[j].number);
    if(footprintsOverlap(cars[i],cars[j],held ? .12 : 0))parent[root(i)]=root(j);
  }
  const groups=new Map<number,number[]>();
  cars.forEach((car,i)=>{const key=root(i),members=groups.get(key)??[];members.push(car.number);groups.set(key,members);});
  return [...groups.values()].map(members=>{
    members.sort((a,b)=>a-b);
    return {representative:members.includes(selected)?selected:partner!==undefined&&members.includes(partner)?partner:members[0],members};
  });
}
