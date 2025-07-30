import { Link } from "react-router";
import { Button } from "../ui/button";

export function Hero({
  img_src,
  img_alt,
}: {
  img_src: string;
  img_alt: string;
}) {
  return (
    <section className="bg-white dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 flex flex-col-reverse md:flex-row items-center gap-12">
        {/* Text side */}
        <div className="md:w-1/2 space-y-6 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
            쉽고 즐거운 코딩, <br />
            코딩멘토가 함께합니다
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            초등 고학년부터 성인까지
            <br className="hidden sm:inline" />
            눈높이에 딱 맞춘 맞춤형 원격 코딩 수업
          </p>
          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-4">
            <Button size="lg" asChild>
              <Link
                target="_blank"
                rel="noopener noreferrer"
                to="https://docs.google.com/forms/d/e/1FAIpQLSfbOVggLG1S46zQ8unabgCu0pPPqeC8lMUh76fOEWY8MUss7A/viewform?usp=sharing&ouid=112713208317921974620"
              >
                무료 체험 신청하기
              </Link>
            </Button>

            <Link to="/#curriculum">
              <Button variant="outline" size="lg">
                커리큘럼 보기
              </Button>
            </Link>
          </div>
        </div>

        {/* Illustration side */}
        <div className="md:w-1/2 flex justify-center">
          <img
            src={img_src}
            alt={img_alt}
            className="w-full object-cover"
            // className="rounded-2xl shadow-lg w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}
