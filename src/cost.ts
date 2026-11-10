import { ROLE_SALARY, Role } from "./people";

export type Meeting ={
    people: string[];
    roles: Role[];
    durationMinutes: number;
};

export type MeetingRecord = {
    start: number,
    durationMinutes: number,
    elapsedSeconds: number,
    roles: Role[],
    people?: string[], // missing on records saved before names were stored
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

export function meetingRecord(meeting: Meeting, start: Date, now: Date): MeetingRecord{
    const out = {
      start: start.getTime(),
      durationMinutes: meeting.durationMinutes,
      elapsedSeconds: calcElapsedSeconds(start, now),
      roles: meeting.roles,
      people: meeting.people,
      cost: meetingCost(meeting, start, now)
    };
  
    return out;
}

export function getMeetingRecords(meetings: MeetingRecord[], startDate: Date, endDate: Date): MeetingRecord[]{

    const out = meetings.filter( m =>(m.start >= startDate.getTime() && m.start < endDate.getTime()));

    return out;
}

export function totalCost(meetings: MeetingRecord[]): number{

    return meetings.reduce( (out, m) => out + m.cost, 0);
}

export function topByCost(meetings: MeetingRecord[], n: number): MeetingRecord[]{

    const copied = [...meetings];

    const sorted = copied.sort( (a, b) => b.cost - a.cost);

    const topN = sorted.slice(0, n);

    return topN
}

export function monthRange(now: Date): [Date, Date]{

    return [new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1)];
}

// calendar quarters, which line up with AU financial-year quarters
export function quarterRange(now: Date): [Date, Date]{

    const first = Math.floor(now.getMonth() / 3) * 3;

    return [new Date(now.getFullYear(), first, 1), new Date(now.getFullYear(), first + 3, 1)];
}
