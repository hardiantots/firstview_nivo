import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import abstractHeader from "@/assets/abstract-header.jpg";

const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
});

type ForgotPasswordFormValues = z.infer<typeof ForgotPasswordSchema>;

const ForgotPasswordScreen = () => {
  const navigate = useNavigate();
  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (data: ForgotPasswordFormValues) => {
    console.log("Password reset request for:", data.email);
    navigate("/otp-verification", { state: { email: data.email } });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with back button */}
      <div className="h-48 relative overflow-hidden">
        <img
          src={abstractHeader}
          alt="Abstract colorful background"
          className="w-full h-full object-cover"
        />
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
      </div>

      {/* Content */}
      <div className="px-6 py-8 animate-fade-in">
        <h1 className="text-2xl font-bold mb-2">Forgot Password</h1>
        <p className="text-muted-foreground mb-8">
          Enter your email to receive a verification code.
        </p>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input type="email" placeholder="Masukkan email" {...field} className="pr-10" />
                      <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" size="lg" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Send Code"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default ForgotPasswordScreen;