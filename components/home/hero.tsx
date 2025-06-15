'use client';

import { HiSparkles, HiStar } from 'react-icons/hi2';
import { useRouter } from 'next/navigation';

export default function Hero() {
  const router = useRouter();

  const handleStartChat = () => {
    // 跳转到聊天页面
    router.push('/chat');
  };

  return (
    <div className="bg-background">
      <div className="relative min-h-screen">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-background to-pink-50/50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20"></div>
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-300/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-300/10 rounded-full blur-3xl"></div>

        <div className="relative mx-auto max-w-7xl">
          <div className="flex flex-col lg:flex-row items-center min-h-screen">
            {/* Left side - Main content */}
            <div className="flex-2 px-6 py-20 lg:px-8 lg:py-32">
              <div className="mx-auto max-w-2xl lg:mx-0">
                {/* Badge */}
                <div className="flex justify-center lg:justify-start mb-8">
                  <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-200/20 dark:border-purple-700/20 backdrop-blur-sm">
                    <HiStar className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      AI-Powered Logo Design
                    </span>
                  </div>
                </div>

                {/* Main title */}
                <h1 className="text-center lg:text-left text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-tight">
                  <span className="bg-gradient-to-r from-purple-600 via-pink-500 to-blue-500 bg-clip-text text-transparent">
                    Create Your Unique Logo
                  </span>
                  <span className="text-foreground"> with </span>
                  <span className="bg-gradient-to-r from-purple-600 to-pink-500 bg-clip-text text-transparent animate-pulse">
                    ChatLogo
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="mt-6 text-center lg:text-left text-lg sm:text-xl text-muted-foreground max-w-2xl leading-relaxed">
                  Simply describe your ideal logo, and our AI will generate
                  stunning, futuristic designs for you in seconds.
                </p>

                {/* CTA Button Section */}
                <div className="mt-10 flex justify-center lg:justify-start">
                  <button
                    onClick={handleStartChat}
                    className="group px-10 py-5 text-lg sm:text-xl font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-3 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                    <HiSparkles className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" />
                    <span>Start Generating Logo</span>
                  </button>
                </div>

                {/* Feature indicators */}
                <div className="mt-8 flex flex-wrap justify-center lg:justify-start gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Instant Generation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>High Quality</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>AI Powered</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Visual elements */}
            <div className="flex-1 lg:h-screen flex items-center justify-center p-8 lg:p-12">
              <div className="relative w-full max-w-md">
                {/* Floating logo examples */}
                <div className="relative space-y-8">
                  {/* Main logo mockup */}
                  <div className="relative mx-auto w-48 h-48 rounded-3xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 shadow-2xl transform rotate-3 hover:rotate-6 transition-transform duration-500">
                    <div className="absolute inset-4 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/30 rounded-xl"></div>
                    </div>
                  </div>

                  {/* Floating elements */}
                  <div className="absolute -top-8 -left-4 w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-xl transform -rotate-12 animate-pulse"></div>
                  <div className="absolute -bottom-4 -right-8 w-20 h-20 bg-gradient-to-r from-pink-500 to-red-500 rounded-xl shadow-lg transform rotate-45 animate-bounce"></div>
                  <div className="absolute top-1/2 -right-12 w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full shadow-lg animate-pulse"></div>
                  <div className="absolute top-8 right-8 w-12 h-12 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg shadow-md transform rotate-12 animate-bounce"></div>
                </div>

                {/* Background decoration */}
                <div className="absolute inset-0 -z-10">
                  <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-purple-300/20 rounded-full blur-2xl"></div>
                  <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-pink-300/20 rounded-full blur-3xl"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
