export function formatNaturalPriceResponse(
  entities: any[]
) {
  const items =
    entities.filter(
      (entity) =>
        entity.name &&
        entity.price
    );

  if (
    items.length === 0
  ) {
    return "I don't have the pricing information for those items right now.";
  }

  if (
    items.length === 1
  ) {
    return `The ${items[0].name} is ${items[0].price}.`;
  }

  const lines =
    items.map(
      (item) =>
        `• ${item.name} — ${item.price}`
    );

  return (
    `Sure. Here are the prices:\n\n` +
    lines.join("\n")
  );
}

export function formatNaturalAvailabilityResponse(
  entities: any[]
) {
  const items =
    entities.filter(
      (entity) =>
        entity.name
    );

  if (
    items.length === 0
  ) {
    return "I don't have the availability information right now.";
  }

  const lines =
    items.map(
      (item) => {
        if (
          item.available === true
        ) {
          return `• ${item.name} — available`;
        }

        if (
          item.available === false
        ) {
          return `• ${item.name} — currently unavailable`;
        }

        return `• ${item.name} — availability not listed`;
      }
    );

  return (
    `Yes. Here's the current availability:\n\n` +
    lines.join("\n")
  );
}