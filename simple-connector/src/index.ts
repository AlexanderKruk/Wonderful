type CustomerSystemResponse = {
  client_no: string;
  full_name: string;
  contact: {
    email_address?: string;
  } | null;
  status_code: string;
};

async function getCustomerFromCustomerSystem(
  customerId: string,
): Promise<CustomerSystemResponse> {
  return {
    client_no: customerId,
    full_name: "Anna Nowak",
    contact: {
      email_address: "anna@example.com",
    },
    status_code: "A",
  };
}

async function main(): Promise<void> {
  const rawCustomer = await getCustomerFromCustomerSystem("8123");
  console.log(rawCustomer);
}

main();
