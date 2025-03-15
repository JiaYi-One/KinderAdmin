import React from "react";

export const today: string = new Date().toISOString().split("T")[0];

const DateInput: React.FC = () => {
  return <>{today}</>;
};

export default DateInput;
