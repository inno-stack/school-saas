import { NextResponse } from "next/server";

export function successResponse<T>(
  data: T,
  message: string = "Success",
  status: number = 200,
) {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse(
  message: string,
  status: number = 400,
  errors?: unknown,
) {
  return NextResponse.json(
    { 
      success: false, 
      message, 
      // If errors exists, spread the object; otherwise spread an empty object
      ...(errors ? { errors } : {}) 
    },
    { status },
  );
}