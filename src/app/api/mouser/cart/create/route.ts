import { NextRequest, NextResponse } from 'next/server';
import { mouserClient } from '@/lib/mouser/client';
import { MouserCartItem } from '@/lib/mouser/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items, cartKey } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'No items provided for cart creation' },
        { status: 400 }
      );
    }

    const validItems: MouserCartItem[] = items.map((i: { MouserPartNumber: string; Quantity: number; CustomerPartNumber?: string }) => ({
      MouserPartNumber: String(i.MouserPartNumber || '').trim(),
      Quantity: Math.max(1, Number(i.Quantity) || 1),
      CustomerPartNumber: i.CustomerPartNumber ? String(i.CustomerPartNumber).trim() : undefined,
    })).filter((i) => i.MouserPartNumber.length > 0);

    if (validItems.length === 0) {
      return NextResponse.json(
        { error: 'No items with valid Mouser Part Numbers could be added to the cart' },
        { status: 400 }
      );
    }

    const headerKey = req.headers.get('x-mouser-cart-key') || undefined;

    const cartResponse = await mouserClient.createCart(
      validItems,
      headerKey,
      cartKey
    );

    return NextResponse.json(cartResponse);
  } catch (error: unknown) {
    console.error('Error in /api/mouser/cart/create:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to create Mouser cart' },
      { status: 500 }
    );
  }
}
