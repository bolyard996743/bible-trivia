"use client";

import { useMemo, useState, type FormEvent } from "react";
import { calendarToday, isValidCalendarDate, type CalendarDate } from "@/lib/account/age-gate";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function BirthdayForm({ onContinue }: { onContinue: (date: CalendarDate) => void }) {
  const today = useMemo(() => calendarToday(), []);
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [year, setYear] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const years = useMemo(() => {
    const list: number[] = [];
    for (let value = today.year; value >= today.year - 120; value -= 1) list.push(value);
    return list;
  }, [today.year]);

  function submit(event: FormEvent) {
    event.preventDefault();
    const date = { year: Number(year), month: Number(month), day: Number(day) };
    if (!year || !month || !day || !isValidCalendarDate(date) || ageIsInTheFuture(date, today)) {
      setMessage("Enter a real date.");
      return;
    }
    setMessage(null);
    onContinue(date);
  }

  return (
    <form onSubmit={submit} className="grid gap-4" data-testid="birthday-form">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-2 text-lg" htmlFor="birth-month">
          Month
          <select
            id="birth-month"
            data-testid="birth-month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="min-h-14 rounded-2xl border border-line bg-card px-3"
          >
            <option value="">Month</option>
            {MONTHS.map((name, index) => (
              <option key={name} value={String(index + 1)}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-lg" htmlFor="birth-day">
          Day
          <select
            id="birth-day"
            data-testid="birth-day"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="min-h-14 rounded-2xl border border-line bg-card px-3"
          >
            <option value="">Day</option>
            {Array.from({ length: 31 }, (_, index) => (
              <option key={index + 1} value={String(index + 1)}>
                {index + 1}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-lg" htmlFor="birth-year">
          Year
          <select
            id="birth-year"
            data-testid="birth-year"
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="min-h-14 rounded-2xl border border-line bg-card px-3"
          >
            <option value="">Year</option>
            {years.map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message ? <p className="text-lg text-ink">{message}</p> : null}
      <button type="submit" data-testid="birth-continue" className="rounded-2xl bg-grove px-4 text-lg font-semibold text-white">
        Continue
      </button>
    </form>
  );
}

function ageIsInTheFuture(date: CalendarDate, today: CalendarDate): boolean {
  if (date.year > today.year) return true;
  if (date.year < today.year) return false;
  if (date.month > today.month) return true;
  if (date.month < today.month) return false;
  return date.day > today.day;
}
