import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ExploreServicesCard from "./ExploreServicesCard";

const exploreServices = [
  { id: "service-1", imgUrl: "https://images.prismic.io/alphas/aCbEOidWJ-7kSMEf_design.jpg?auto=format,compress", title: "Technical Services" },
  { id: "service-2", imgUrl: "https://images.prismic.io/alphas/aCbFLSdWJ-7kSMEw_360_F_167783828_JJi1bjBS3G6GgoCVnLvtDRgX1qksDBcN.jpg?auto=format,compress", title: "Design Services" },
  { id: "service-3", imgUrl: "https://images.prismic.io/alphas/aCbfuCdWJ-7kSMky_what-to-learn-to-get-a-digital-marketing-job-2048x1365.jpeg?auto=format,compress", title: "Marketing Services" },
];

export default function Explore() {
  const [active, setActive] = useState<string>("service-2");

  return (
    <section className="min-h-screen bg-black relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />
      
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black pointer-events-none" />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32 relative">
        {/* Header */}
        <div className="text-center mb-16 md:mb-24">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white"
          >
            Explore Services
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-4 text-lg text-white/50"
          >
            Discover our diverse range of services
          </motion.p>
        </div>

        {/* Cards */}
        <div className="flex lg:flex-row flex-col min-h-[70vh] gap-5">
          {exploreServices.map((service, index) => (
            <ExploreServicesCard
              key={service.id}
              {...service}
              index={index}
              active={active}
              handleClick={setActive}
            />
          ))}
        </div>

        {/* CTA Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 flex justify-center"
        >
          <Link
            to="/services"
            className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-neutral-200 transition-colors"
          >
            View All Services
            <svg
              className="w-4 h-4"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M10.4767 6.16664L6.00668 1.69664L7.18501 0.518311L13.6667 6.99998L7.18501 13.4816L6.00668 12.3033L10.4767 7.83331H0.333344V6.16664H10.4767Z"
                fill="currentColor"
              />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
