import { ROLE_SALARY, Role } from "./people";

export type Meeting ={
    roles: Role[];
    durationMinutes: number;
};

export type MeetingRecord = {
    start: number,
    durationMinutes: number,
    elapsedSeconds: number,
    roles: Role[],
    cost: number
}

// 52 weeks, 5 days a week, 13 public holiday in VIC, 20 days PTO.
// 8.5 working hours per day
const WORKING_SECONDS_PER_YEAR = (52 * 5 - 13 - 20) * 8.5 * 60 * 60;

export function roleCostPerSecond(role: Role): number{
    return ROLE_SALARY[role] / WORKING_SECONDS_PER_YEAR;
  }
  
  export function meetingCostPerSecond(meeting: Meeting): number{
  
    let total = 0;
  
    for (const role of meeting.roles){
      total += roleCostPerSecond(role);
    }
  
    return total;
}

export function calcElapsedSeconds(start: Date, now: Date): number{
    // getTime in ms, /1000 to get seconds
    return (now.getTime() - start.getTime()) / 1000
}

export const formatter = new Intl.NumberFormat("en-AU", {style: "currency", currency: "AUD"})

export function meetingCost(meeting: Meeting, start: Date, now: Date): number {

    const costPerSecond = meetingCostPerSecond(meeting);
    const elapsedSeconds = calcElapsedSeconds(start, now);
  
    return costPerSecond * elapsedSeconds;
}

export function meter(meeting: Meeting, start: Date, now: Date): string{

    const out = meetingCost(meeting, start, now)
  
    return `meeting now costs ${formatter.format(out)}`;
}

export function meetingRecord(meeting: Meeting, start: Date, now: Date): MeetingRecord{
    const out = {
      start: start.getTime(),
      durationMinutes: meeting.durationMinutes,
      elapsedSeconds: calcElapsedSeconds(start, now),
      roles: meeting.roles,
      cost: meetingCost(meeting, start, now)
    };
  
    return out;
}