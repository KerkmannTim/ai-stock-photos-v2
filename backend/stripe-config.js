const Stripe = require('stripe');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

async function testStripeConnection() {
  try {
    // Create a test product
    const product = await stripe.products.create({
      name: 'Test Product (can be deleted)',
      description: 'Created by testStripeConnection() to verify Stripe API connectivity',
    });

    // Create a test price for the product
    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: 100, // €1.00 in cents
      currency: 'eur',
    });

    console.log('Stripe connection test succeeded!');
    console.log('Product ID:', product.id);
    console.log('Price ID:', price.id);
    return { product, price };
  } catch (error) {
    console.error('Stripe connection test failed:', error.message);
    throw error;
  }
}

module.exports = stripe;
module.exports.testStripeConnection = testStripeConnection;
