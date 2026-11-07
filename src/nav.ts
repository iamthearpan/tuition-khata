export type Route =
  | { name: 'studentDetail'; id: string }
  | { name: 'studentForm'; id?: string }
  | { name: 'batchForm'; id?: string }
  | { name: 'payment'; studentId: string; paymentId?: string }
  | { name: 'reminder'; studentId: string }
  | { name: 'feeChange'; studentId: string }
  | { name: 'adjust'; studentId: string; month: string };

export interface Nav {
  push: (r: Route) => void;
  pop: () => void;
}
