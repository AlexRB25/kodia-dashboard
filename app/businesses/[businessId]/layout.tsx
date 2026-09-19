import BusinessSidebar from "./BusinessSidebar";

type BusinessLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    businessId: string;
  }>;
};

export default async function BusinessLayout({
  children,
  params,
}: BusinessLayoutProps) {
  const { businessId } = await params;

  return (
    <div className="min-h-screen bg-[#070708] text-white">
      <BusinessSidebar businessId={businessId} />

      <div className="ml-64 min-h-screen">
        <div className="mx-auto w-full max-w-[1600px] px-8 py-8 lg:px-10">
          {children}
        </div>
      </div>
    </div>
  );
}
